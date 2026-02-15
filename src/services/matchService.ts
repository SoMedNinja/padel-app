import { supabase } from "../supabaseClient";
import { Match, MatchFilter } from "../types";
import { checkIsAdmin, ensureAuthSessionReady, requireAdmin } from "./authUtils";
import { buildMatchCreateRequest } from "./contract/contractTransforms";

type MatchCreateInput = any;

type MatchSubmissionStatus = "synced" | "pending" | "failed" | "conflict";

export interface MatchCreateResult {
  status: MatchSubmissionStatus;
  message: string;
}

interface QueuedMatchMutation {
  queueId: string;
  createdAt: string;
  attempts: number;
  payload: MatchCreateInput[];
}

interface MutationQueueSnapshot {
  pendingCount: number;
  failedCount: number;
  status: "synced" | "pending" | "failed";
  lastError: string | null;
  lastSyncedAt: string | null;
}

const QUEUE_STORAGE_KEY = "match-mutation-queue-v1";
const RETRYABLE_ERROR_SIGNATURES = ["failed to fetch", "network", "offline", "timeout"];
const MAX_AUTO_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 12_000;
const MAX_RETRY_DELAY_MS = 60_000;
const MATCH_CONFLICT_MESSAGE = "Konflikt upptäckt: en offline-sparad match skiljer sig från matchen som redan synkats. Öppna historiken och avgör vilken version som gäller innan du försöker igen.";
const DEFAULT_QUEUE_STATE: MutationQueueSnapshot = {
  pendingCount: 0,
  failedCount: 0,
  status: "synced",
  lastError: null,
  lastSyncedAt: null,
};

let queueState: MutationQueueSnapshot = { ...DEFAULT_QUEUE_STATE };
const queueSubscribers = new Set<(state: MutationQueueSnapshot) => void>();
let queueProcessing = false;
let queueRetryTimer: number | null = null;
let onlineListenerInstalled = false;

const notifyQueueSubscribers = () => {
  for (const subscriber of queueSubscribers) {
    subscriber(queueState);
  }
};

const updateQueueState = (next: Partial<MutationQueueSnapshot>) => {
  queueState = { ...queueState, ...next };
  notifyQueueSubscribers();
};

const canUseBrowserStorage = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

const readQueue = (): QueuedMatchMutation[] => {
  if (!canUseBrowserStorage()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: QueuedMatchMutation[]) => {
  if (!canUseBrowserStorage()) return;
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

const computeHash = (input: MatchCreateInput) => {
  // Note for non-coders: this turns the payload into a deterministic "fingerprint" so retries can
  // verify whether an older queued request would overwrite newer data.
  const normalized = JSON.stringify(input, Object.keys(input).sort());
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return `h${Math.abs(hash)}`;
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine;

const getRetryDelayMs = (attempts: number) => {
  const delay = BASE_RETRY_DELAY_MS * Math.max(1, 2 ** Math.max(0, attempts - 1));
  return Math.min(delay, MAX_RETRY_DELAY_MS);
};

const scheduleQueueRetry = (attempts: number) => {
  if (typeof window === "undefined") return;
  if (queueRetryTimer) window.clearTimeout(queueRetryTimer);
  queueRetryTimer = window.setTimeout(() => {
    queueRetryTimer = null;
    void processQueuedMutations();
  }, getRetryDelayMs(attempts));
};

const refreshQueueStatusFromStorage = () => {
  const queue = readQueue();
  const failedCount = queue.filter(item => item.attempts >= MAX_AUTO_RETRY_ATTEMPTS).length;
  updateQueueState({
    pendingCount: queue.length,
    failedCount,
    status: failedCount > 0 ? "failed" : queue.length > 0 ? "pending" : "synced",
  });
};

const isRetryableMutationError = (error: unknown) => {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return RETRYABLE_ERROR_SIGNATURES.some(signature => message.includes(signature));
};

const enrichMatchPayload = (match: MatchCreateInput, userId: string) => {
  const contractMatch = buildMatchCreateRequest({ ...match, created_by: userId });
  const {
    id: _id,
    created_at: _created_at,
    created_by: _created_by,
    match_mode: _match_mode,
    ...rest
  } = contractMatch;

  const clientSubmissionId =
    typeof rest.client_submission_id === "string" && rest.client_submission_id.trim().length
      ? rest.client_submission_id
      : (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `local-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  return {
    ...rest,
    created_by: userId,
    client_submission_id: clientSubmissionId,
    client_payload_hash: computeHash(rest),
  };
};

const detectSubmissionConflict = async (createdBy: string, payload: MatchCreateInput[]) => {
  const submissionIds = payload
    .map(item => item.client_submission_id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);

  if (!submissionIds.length) {
    return null;
  }

  const { data, error } = await supabase
    .from("matches")
    .select("client_submission_id, client_payload_hash")
    .eq("created_by", createdBy)
    .in("client_submission_id", submissionIds);

  if (error || !data?.length) {
    return null;
  }

  const existingById = new Map<string, string | null>(
    data.map((row: any) => [row.client_submission_id, row.client_payload_hash ?? null])
  );

  const hasConflict = payload.some(item => {
    const submissionId = item.client_submission_id;
    if (typeof submissionId !== "string" || !existingById.has(submissionId)) return false;
    const existingHash = existingById.get(submissionId);
    return existingHash && existingHash !== item.client_payload_hash;
  });

  return hasConflict
    ? MATCH_CONFLICT_MESSAGE
    : null;
};

const submitMatchPayload = async (payload: MatchCreateInput[]): Promise<MatchCreateResult> => {
  const { data: sessionData } = await supabase.auth.getSession();
  const currentUser = sessionData.session?.user;

  if (!currentUser) {
    throw new Error("Du måste vara inloggad för att registrera en match.");
  }

  const normalizedPayload = payload.map(item => enrichMatchPayload(item, currentUser.id));

  const { error } = await supabase.from("matches").insert(normalizedPayload);

  if (!error) {
    return {
      status: "synced",
      message: "Matchen är synkad.",
    };
  }

  if (error.code === "23505") {
    const conflictMessage = await detectSubmissionConflict(currentUser.id, normalizedPayload);
    if (conflictMessage) {
      return { status: "conflict", message: conflictMessage };
    }

    return {
      status: "synced",
      message: "Matchen var redan synkad från en tidigare uppladdning.",
    };
  }

  throw error;
};

const enqueueMatchMutation = (matches: MatchCreateInput[]): MatchCreateResult => {
  const queue = readQueue();
  queue.push({
    queueId: (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : `queue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
    payload: matches,
  });
  writeQueue(queue);
  refreshQueueStatusFromStorage();
  scheduleQueueRetry(0);

  return {
    status: "pending",
    message: "Matchen sparades lokalt och skickas automatiskt när du är online.",
  };
};

const processQueuedMutations = async (options: { manual?: boolean } = {}) => {
  const { manual = false } = options;
  if (queueProcessing) return;
  if (!isOnline()) {
    refreshQueueStatusFromStorage();
    return;
  }

  const queue = readQueue();
  if (!queue.length) {
    updateQueueState({ status: "synced", pendingCount: 0, failedCount: 0, lastError: null, lastSyncedAt: new Date().toISOString() });
    return;
  }

  queueProcessing = true;
  const mutableQueue = [...queue];

  while (mutableQueue.length) {
    const current = mutableQueue[0];
    if (!manual && current.attempts >= MAX_AUTO_RETRY_ATTEMPTS) {
      updateQueueState({
        lastError: current.attempts === MAX_AUTO_RETRY_ATTEMPTS
          ? "Automatisk synkning pausad efter flera försök. Kontrollera anslutning eller data och tryck sedan på 'Försök synka igen'."
          : queueState.lastError,
      });
      break;
    }

    try {
      const result = await submitMatchPayload(current.payload);
      if (result.status === "conflict") {
        current.attempts = Math.max(current.attempts, MAX_AUTO_RETRY_ATTEMPTS);
        mutableQueue[0] = current;
        writeQueue(mutableQueue);
        refreshQueueStatusFromStorage();
        updateQueueState({ lastError: result.message });
        break;
      }

      mutableQueue.shift();
      writeQueue(mutableQueue);
      refreshQueueStatusFromStorage();
      updateQueueState({ lastSyncedAt: new Date().toISOString(), lastError: null });
    } catch (error) {
      current.attempts += 1;
      mutableQueue[0] = current;
      writeQueue(mutableQueue);
      refreshQueueStatusFromStorage();
      updateQueueState({
        lastError: error instanceof Error ? error.message : "Kunde inte synka offline-kö.",
      });
      if (current.attempts < MAX_AUTO_RETRY_ATTEMPTS) {
        scheduleQueueRetry(current.attempts);
      }
      break;
    }
  }

  queueProcessing = false;
};

const installOnlineListenerIfNeeded = () => {
  if (onlineListenerInstalled || typeof window === "undefined") return;
  onlineListenerInstalled = true;
  window.addEventListener("online", () => {
    void processQueuedMutations();
  });
};

const getDateRange = (filter: MatchFilter) => {
  if (filter.type === "last7") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { start, end: new Date() };
  }
  if (filter.type === "last30") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { start, end: new Date() };
  }
  if (filter.type === "range" && (filter.startDate || filter.endDate)) {
    const start = filter.startDate ? new Date(filter.startDate) : null;
    const end = filter.endDate ? new Date(filter.endDate) : null;
    if (start) start.setHours(0, 0, 0, 0);
    if (end) end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  return null;
};

export const matchService = {
  initMutationQueue(): void {
    installOnlineListenerIfNeeded();
    refreshQueueStatusFromStorage();
    void processQueuedMutations();
  },

  subscribeToMutationQueue(listener: (state: MutationQueueSnapshot) => void): () => void {
    queueSubscribers.add(listener);
    listener(queueState);
    return () => {
      queueSubscribers.delete(listener);
    };
  },

  getMutationQueueState(): MutationQueueSnapshot {
    return queueState;
  },

  async flushMutationQueue(): Promise<void> {
    await processQueuedMutations({ manual: true });
  },

  async getMatches(filter?: MatchFilter): Promise<Match[]> {
    await ensureAuthSessionReady();
    let query = supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter) {
      if (filter.type === "short") {
        query = query.lte("team1_sets", 3).lte("team2_sets", 3);
      } else if (filter.type === "long") {
        query = query.or("team1_sets.gte.6,team2_sets.gte.6");
      } else if (filter.type === "tournaments") {
        query = query.not("source_tournament_id", "is", null);
      }

      const range = getDateRange(filter);
      if (range?.start) {
        query = query.gte("created_at", range.start.toISOString());
      }
      if (range?.end) {
        query = query.lte("created_at", range.end.toISOString());
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Match[];
  },

  async createMatch(match: MatchCreateInput): Promise<MatchCreateResult> {
    const matches = Array.isArray(match) ? match : [match];

    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;

    if (!currentUser) {
      throw new Error("Du måste vara inloggad för att registrera en match.");
    }

    for (const m of matches) {
      if (m.team1_sets !== undefined && (typeof m.team1_sets !== "number" || m.team1_sets < 0)) {
        throw new Error("Ogiltigt resultat för Lag 1");
      }
      if (m.team2_sets !== undefined && (typeof m.team2_sets !== "number" || m.team2_sets < 0)) {
        throw new Error("Ogiltigt resultat för Lag 2");
      }

      const validateNames = (names: any, teamLabel: string) => {
        if (Array.isArray(names)) {
          for (const name of names) {
            if (typeof name === "string" && name.length > 50) {
              throw new Error(`Namn i ${teamLabel} är för långt (max 50 tecken)`);
            }
          }
        }
      };
      validateNames(m.team1, "Lag 1");
      validateNames(m.team2, "Lag 2");

      if (typeof m.source_tournament_id === "string" && m.source_tournament_id.length > 50) {
        throw new Error("Ogiltigt turnerings-ID");
      }
    }

    const sanitizedMatches = matches.map(item => ({ ...item, created_by: currentUser.id }));

    if (!isOnline()) {
      return enqueueMatchMutation(sanitizedMatches);
    }

    try {
      const result = await submitMatchPayload(sanitizedMatches);
      return result;
    } catch (error) {
      if (isRetryableMutationError(error)) {
        return enqueueMatchMutation(sanitizedMatches);
      }
      throw error;
    }
  },

  async updateMatch(matchId: string, updates: any): Promise<void> {
    await requireAdmin("Endast administratörer kan ändra registrerade matcher.");

    if (updates.team1_sets !== undefined && (typeof updates.team1_sets !== "number" || updates.team1_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 1");
    }
    if (updates.team2_sets !== undefined && (typeof updates.team2_sets !== "number" || updates.team2_sets < 0)) {
      throw new Error("Ogiltigt resultat för Lag 2");
    }

    const filteredUpdates = { ...updates };
    delete filteredUpdates.id;
    delete filteredUpdates.created_at;
    delete filteredUpdates.created_by;

    const { error } = await supabase
      .from("matches")
      .update(filteredUpdates)
      .eq("id", matchId);
    if (error) throw error;
  },

  async deleteMatch(matchId: string): Promise<void> {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user;
    const isAdmin = await checkIsAdmin(currentUser?.id);

    const { data: match } = await supabase.from("matches").select("created_by").eq("id", matchId).single();

    if (!isAdmin && (!currentUser || match?.created_by !== currentUser.id)) {
      throw new Error("Du har inte behörighet att radera denna match.");
    }

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (error) throw error;
  },

  async deleteMatchesByTournamentId(tournamentId: string): Promise<void> {
    await requireAdmin("Endast administratörer kan radera turneringsmatcher i bulk.");

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("source_tournament_id", tournamentId);
    if (error) throw error;
  },
};
