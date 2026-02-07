import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  Switch,
  Stack,
  Typography,
  Divider,
  MenuItem,
  Select,
  AvatarGroup,
  IconButton,
  Tooltip,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  LinearProgress,
  TextField,
  ListItemText,
} from "@mui/material";
// Note for non-coders: IconButton is the small clickable icon used for menus and actions, so it must be imported here.
import Avatar from "../Components/Avatar";
import EmptyState from "../Components/Shared/EmptyState";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  Email as EmailIcon,
  MoreVert as MoreVertIcon,
  Event as EventIcon,
} from "@mui/icons-material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import PullToRefresh from "react-simple-pull-to-refresh";
import { PullingContent, RefreshingContent } from "../Components/Shared/PullToRefreshContent";
import { useStore } from "../store/useStore";
import { useAvailabilityPolls } from "../hooks/useAvailabilityPolls";
import { useProfiles } from "../hooks/useProfiles";
import { useScheduledGames } from "../hooks/useScheduledGames";
import { useRefreshInvalidations } from "../hooks/useRefreshInvalidations";
import { availabilityService } from "../services/availabilityService";
import { invalidateAvailabilityData } from "../data/queryInvalidation";
import { AvailabilityPoll, AvailabilityPollDay, AvailabilitySlot } from "../types";
import { evaluatePollDay } from "../utils/availabilityStatus";
import { getISOWeek, formatShortDate, formatFullDate } from "../utils/format";
import { queryKeys } from "../utils/queryKeys";

interface UpcomingWeekOption {
  key: string;
  label: string;
  week: number;
  year: number;
}

const SLOT_OPTIONS: Array<{ value: AvailabilitySlot; label: string }> = [
  { value: "morning", label: "Morgon" },
  { value: "day", label: "Dag" },
  { value: "evening", label: "Kväll" },
];

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const formatTime = (time: string) => time.slice(0, 5);

const buildUpcomingWeeks = (count = 26): UpcomingWeekOption[] => {
  const start = new Date();
  const seen = new Set<string>();
  const options: UpcomingWeekOption[] = [];

  for (let offset = 0; options.length < count; offset += 7) {
    const date = addDays(start, offset);
    const { week, year } = getISOWeek(date);
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    options.push({ key, label: `Vecka ${week} (${year})`, week, year });
  }

  return options;
};

// Note for non-coders: if a user hasn't selected any slot, that means "whole day".
const normalizeVoteSlots = (day: AvailabilityPollDay, userId?: string): AvailabilitySlot[] | null => {
  if (!userId) return null;
  const vote = day.votes?.find((entry) => entry.profile_id === userId);
  if (!vote) return null;

  if (vote.slot_preferences && vote.slot_preferences.length > 0) {
    return vote.slot_preferences;
  }

  if (vote.slot) return [vote.slot];
  return [];
};

const computeEmailAvailability = (poll: AvailabilityPoll) => {
  const logs = poll.mail_logs || [];
  const sentCount = logs.length;
  const latest = logs[0]?.sent_at ? new Date(logs[0].sent_at) : null;

  if (sentCount >= 2) {
    return {
      canSend: false,
      helper: "Max 2 mail redan skickade för denna omröstning.",
    };
  }

  if (!latest) {
    return {
      canSend: true,
      helper: "Inga utskick ännu.",
    };
  }

  const nextAllowed = new Date(latest.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < nextAllowed) {
    const hoursLeft = Math.ceil((nextAllowed.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      canSend: false,
      helper: `Vänta cirka ${hoursLeft}h till nästa utskick.`,
    };
  }

  return {
    canSend: true,
    helper: "Du kan skicka påminnelse nu.",
  };
};

export const mergeExpandedPollsState = (
  previousState: Record<string, boolean>,
  pollsSorted: Array<Pick<AvailabilityPoll, "id" | "status">>,
) => {
  let addedNewPoll = false;
  const nextState = { ...previousState };

  pollsSorted.forEach((poll, index) => {
    if (!(poll.id in nextState)) {
      // Note for non-coders: the very first poll opens automatically if it is open.
      // Closed polls are always collapsed by default.
      nextState[poll.id] = index === 0 && poll.status === "open";
      addedNewPoll = true;
    }
  });

  // Note for non-coders: returning the same object tells React "nothing changed", so no extra rerender.
  return addedNewPoll ? nextState : previousState;
};

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const { user, isGuest } = useStore();
  const canAccessSchema = Boolean(user?.is_regular);
  const [searchParams] = useSearchParams();
  const { data: polls = [], isLoading, isError, error } = useAvailabilityPolls();
  const { data: profiles = [] } = useProfiles();
  const { data: scheduledGames = [], isLoading: isLoadingScheduledGames } = useScheduledGames();
  const weekOptions = useMemo(() => buildUpcomingWeeks(26), []);
  const [selectedWeekKey, setSelectedWeekKey] = useState(weekOptions[1]?.key || weekOptions[0]?.key || "");
  const [expandedPolls, setExpandedPolls] = useState<Record<string, boolean>>({});
  const [didApplyDeepLinkVote, setDidApplyDeepLinkVote] = useState(false);
  const [onlyMissingVotesByPoll, setOnlyMissingVotesByPoll] = useState<Record<string, boolean>>({});
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [actionMenuPollId, setActionMenuPollId] = useState<string | null>(null);
  const [dangerPollId, setDangerPollId] = useState<string | null>(null);
  const [confirmDeletePollId, setConfirmDeletePollId] = useState<string | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [invitePollId, setInvitePollId] = useState<string | null>(null);
  const [inviteDate, setInviteDate] = useState("");
  const [inviteStartTime, setInviteStartTime] = useState("18:00");
  const [inviteEndTime, setInviteEndTime] = useState("20:00");
  const [inviteeProfileIds, setInviteeProfileIds] = useState<string[]>([]);
  const [inviteAction, setInviteAction] = useState<"create" | "update" | "cancel">("create");

  const selectedWeek = weekOptions.find((entry) => entry.key === selectedWeekKey) || weekOptions[0];

  // Note for non-coders: this bundles the refresh actions into one pull-to-refresh callback.
  const handleRefresh = useRefreshInvalidations([
    () => invalidateAvailabilityData(queryClient),
    // Note for non-coders: this re-fetches player names/avatars so they update with a refresh.
    () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles() }),
  ]);

  const profileDataMap = useMemo(() => {
    const map = new Map<string, { name: string; avatar_url?: string | null }>();
    profiles.forEach((profile) => {
      map.set(profile.id, {
        name: profile.name || "Okänd spelare",
        avatar_url: profile.avatar_url
      });
    });
    return map;
  }, [profiles]);

  const eligibleInvitees = useMemo(() => {
    // Note for non-coders: we default to active, regular players so invites go to the core group.
    return profiles.filter((profile) => profile.is_regular && !profile.is_deleted && profile.is_approved);
  }, [profiles]);

  const createPollMutation = useMutation({
    mutationFn: () => availabilityService.createPoll({ weekYear: selectedWeek.year, weekNumber: selectedWeek.week }),
    onSuccess: () => {
      toast.success("Omröstningen skapades.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Kunde inte skapa omröstning.");
    },
  });

  const closePollMutation = useMutation({
    mutationFn: (pollId: string) => availabilityService.closePoll(pollId),
    onSuccess: () => {
      toast.success("Omröstningen stängdes.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte stänga omröstningen."),
  });

  const deletePollMutation = useMutation({
    mutationFn: (pollId: string) => availabilityService.deletePoll(pollId),
    onSuccess: () => {
      toast.success("Omröstningen raderades.");
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte radera omröstningen."),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (payload: { pollId: string; testRecipientEmail?: string; onlyMissingVotes?: boolean }) =>
      availabilityService.sendPollEmail(payload.pollId, {
        testRecipientEmail: payload.testRecipientEmail,
        onlyMissingVotes: payload.onlyMissingVotes,
      }),
    onSuccess: (result) => {
      const isTest = result.mode === "test";
      const usedVoteFilter = result.onlyMissingVotes === true;
      const baseCountText = `${result.sent}/${result.total}`;
      const filterCountText = usedVoteFilter
        ? ` (utan röster: ${result.total}/${result.totalBeforeVoteFilter || result.total}, har redan röstat: ${result.votedProfileCount || 0})`
        : "";

      toast.success(
        isTest
          ? `Testmail skickat till ${baseCountText} mottagare.${filterCountText}`
          : `Påminnelsemail skickat till ${baseCountText} spelare.${filterCountText}`,
      );
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte skicka mail."),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ day, slots }: { day: AvailabilityPollDay; slots: AvailabilitySlot[] | null }) => {
      if (slots === null) {
        await availabilityService.removeVote(day);
        return;
      }
      await availabilityService.upsertVote(day, slots);
    },
    onSuccess: () => {
      invalidateAvailabilityData(queryClient);
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte spara rösten."),
  });

  const sendCalendarInviteMutation = useMutation({
    mutationFn: (payload: {
      pollId?: string | null;
      date: string;
      startTime: string;
      endTime: string;
      inviteeProfileIds: string[];
      action: "create" | "update" | "cancel";
      title?: string;
    }) => availabilityService.sendCalendarInvite(payload),
    onSuccess: (result) => {
      toast.success(`Kalenderinbjudan skickad till ${result.sent}/${result.total} mottagare.`);
      closeInviteDialog();
      queryClient.invalidateQueries({ queryKey: queryKeys.scheduledGames() });
    },
    onError: (err: any) => toast.error(err?.message || "Kunde inte skicka kalenderinbjudan."),
  });

  const pollsSorted = useMemo(() => {
    return [...polls].sort((a, b) => {
      if (a.week_year !== b.week_year) return a.week_year - b.week_year;
      return a.week_number - b.week_number;
    });
  }, [polls]);

  const upcomingBookings = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    // Note for non-coders: we only show future bookings here so the list stays focused on what's next.
    return [...scheduledGames]
      .filter((game) => (game.status || "scheduled") !== "cancelled")
      .filter((game) => game.date >= today)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
  }, [scheduledGames]);

  useEffect(() => {
    if (!pollsSorted.length) return;
    setExpandedPolls((prev) => mergeExpandedPollsState(prev, pollsSorted));
  }, [pollsSorted]);

  useEffect(() => {
    if (didApplyDeepLinkVote || !user || isGuest || pollsSorted.length === 0) return;

    const pollId = searchParams.get("poll");
    const dayId = searchParams.get("day");
    const slotsRaw = searchParams.get("slots");

    if (!pollId || !dayId) {
      setDidApplyDeepLinkVote(true);
      return;
    }

    const poll = pollsSorted.find((entry) => entry.id === pollId);
    const day = poll?.days?.find((entry) => entry.id === dayId);
    if (!poll || !day) {
      setDidApplyDeepLinkVote(true);
      return;
    }

    const parsedSlots = slotsRaw
      ? slotsRaw
          .split(",")
          .map((entry) => entry.trim())
          .filter((entry): entry is AvailabilitySlot => entry === "morning" || entry === "day" || entry === "evening")
      : [];

    setExpandedPolls((prev) => ({ ...prev, [poll.id]: true }));

    let isCancelled = false;

    const applyDeepLinkVote = async () => {
      try {
        // Note for non-coders: a link without slots means "whole day".
        await voteMutation.mutateAsync({ day, slots: parsedSlots });
        if (isCancelled) return;
        toast.success("Länken öppnade rätt dag och förberedde din röst.");
      } catch {
        // Note for non-coders: voteMutation already shows the error toast, so we avoid duplicate messages.
      } finally {
        // Note for non-coders: this marks the deep-link flow as handled once, even if saving failed.
        // That keeps retries deterministic (only on full refresh/new visit, not every re-render).
        if (!isCancelled) {
          setDidApplyDeepLinkVote(true);
        }
      }
    };

    void applyDeepLinkVote();

    return () => {
      isCancelled = true;
    };
  }, [didApplyDeepLinkVote, isGuest, pollsSorted, searchParams, user, voteMutation]);

  const handleWeekStep = (direction: -1 | 1) => {
    const currentIndex = weekOptions.findIndex((entry) => entry.key === selectedWeekKey);
    if (currentIndex < 0) return;
    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= weekOptions.length) return;
    setSelectedWeekKey(weekOptions[nextIndex].key);
  };

  const togglePollExpanded = (pollId: string, expanded: boolean) => {
    setExpandedPolls((prev) => ({ ...prev, [pollId]: expanded }));
  };

  const closeActionMenu = () => {
    setActionMenuAnchorEl(null);
    setActionMenuPollId(null);
  };

  const openActionMenu = (event: MouseEvent<HTMLButtonElement>, pollId: string) => {
    setActionMenuAnchorEl(event.currentTarget);
    setActionMenuPollId(pollId);
  };

  const openInviteDialog = (poll?: AvailabilityPoll) => {
    const pollDays = poll?.days || [];
    const defaultDay = pollDays[0];
    setInvitePollId(poll?.id ?? null);
    setInviteDate(defaultDay?.date || new Date().toISOString().slice(0, 10));
    setInviteStartTime("18:00");
    setInviteEndTime("20:00");
    setInviteAction("create");
    setInviteeProfileIds(eligibleInvitees.map((profile) => profile.id));
    setInviteDialogOpen(true);
  };

  const closeInviteDialog = () => {
    setInviteDialogOpen(false);
    setInvitePollId(null);
  };

  const handleSendInvite = () => {
    sendCalendarInviteMutation.mutate({
      pollId: invitePollId,
      date: inviteDate,
      startTime: inviteStartTime,
      endTime: inviteEndTime,
      inviteeProfileIds,
      action: inviteAction,
      title: invitePollId
        ? `Padel vecka ${pollsSorted.find((entry) => entry.id === invitePollId)?.week_number ?? ""}`.trim()
        : "Padelpass",
    });
  };

  const handleToggleDay = (day: AvailabilityPollDay, checked: boolean) => {
    if (!user) return;
    if (!checked) {
      voteMutation.mutate({ day, slots: null });
      return;
    }

    // Empty array = whole day available.
    voteMutation.mutate({ day, slots: [] });
  };

  const handleToggleSlot = (day: AvailabilityPollDay, slot: AvailabilitySlot, currentlySelected: AvailabilitySlot[]) => {
    const nextSlots = currentlySelected.includes(slot)
      ? currentlySelected.filter((entry) => entry !== slot)
      : [...currentlySelected, slot];

    voteMutation.mutate({ day, slots: nextSlots });
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      pullingContent={<PullingContent />}
      refreshingContent={<RefreshingContent />}
    >
      <Box component="section" sx={{ py: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Schema</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Rösta på de dagar du kan spela. Resultatet uppdateras live för alla.
        </Typography>

        {isGuest && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {/* Note for non-coders: guests can read results but cannot submit votes. */}
            Du är i gästläge. Logga in för att rösta.
          </Alert>
        )}

        {!isGuest && !canAccessSchema && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {/* Note for non-coders: only players marked as "ordinarie" by admin can access Schema. */}
            Du är inte markerad som ordinarie spelare ännu. Kontakta admin för åtkomst till Schema.
          </Alert>
        )}

        <Box sx={{ mb: 4, p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Uppkommande bokningar
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
            {/* Note for non-coders: this section shows scheduled games separately from the voting list. */}
            Här visas planerade matcher som redan är bokade.
          </Typography>
          {user?.is_admin && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<EventIcon />}
              sx={{ mb: 2 }}
              onClick={() => openInviteDialog()}
            >
              Ny kalenderinbjudan
            </Button>
          )}
          {isLoadingScheduledGames ? (
            <Typography variant="body2">Laddar bokningar...</Typography>
          ) : upcomingBookings.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Inga bokningar planerade ännu.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {upcomingBookings.map((game) => (
                <Card key={game.id} variant="outlined">
                  <CardContent sx={{ py: 1.25, "&:last-child": { pb: 1.25 } }}>
                    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>
                          {game.title || "Padelpass"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {formatFullDate(game.date)} • {formatTime(game.start_time)}–{formatTime(game.end_time)}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}>
                        {game.invitee_profile_ids?.length ? `${game.invitee_profile_ids.length} inbjudna` : "Inbjudan skickad"}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Box>

        {user?.is_admin && selectedWeek && (
          <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Ny omröstning:</Typography>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', sm: 'auto' }, justifyContent: 'center' }}>
              <Tooltip title="Föregående vecka" arrow>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Välj föregående vecka"
                    onClick={() => handleWeekStep(-1)}
                    disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) <= 0}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              <Select
                size="small"
                value={selectedWeekKey}
                onChange={(e) => setSelectedWeekKey(e.target.value)}
                sx={{ minWidth: 160, height: 36, fontSize: '0.875rem' }}
              >
                {weekOptions.map((option) => (
                  <MenuItem key={option.key} value={option.key} sx={{ fontSize: '0.875rem' }}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>

              <Tooltip title="Nästa vecka" arrow>
                <span>
                  <IconButton
                    size="small"
                    aria-label="Välj nästa vecka"
                    onClick={() => handleWeekStep(1)}
                    disabled={weekOptions.findIndex((w) => w.key === selectedWeekKey) >= weekOptions.length - 1}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              {/* Note for non-coders: this button starts the poll creation for the selected week. */}
              <Button
                size="small"
                variant="contained"
                onClick={() => createPollMutation.mutate()}
                disabled={createPollMutation.isPending}
                sx={{ whiteSpace: 'nowrap', px: 2 }}
              >
                Skapa
              </Button>
            </Stack>
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as any)?.message || "Kunde inte hämta omröstningar."}
          </Alert>
        )}

        {isLoading ? (
          <Typography>Laddar schema...</Typography>
        ) : pollsSorted.length === 0 ? (
          <EmptyState
            title="Inga omröstningar"
            description="Det finns inga aktiva eller planerade schemaomröstningar just nu."
          />
        ) : (
          <Stack spacing={1.5}>
            {pollsSorted.map((poll) => {
              const mailState = computeEmailAvailability(poll);
              const isExpanded = Boolean(expandedPolls[poll.id]);
              const readyDaysCount = (poll.days || []).filter((day) => evaluatePollDay(day).isGreen).length;
              const totalDaysCount = (poll.days || []).length;
              const progressPercent = totalDaysCount > 0 ? Math.round((readyDaysCount / totalDaysCount) * 100) : 0;

              return (
                <Accordion key={poll.id} expanded={isExpanded} onChange={(_, expanded) => togglePollExpanded(poll.id, expanded)}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" justifyContent="space-between" sx={{ width: "100%" }} spacing={2} alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          Vecka {poll.week_number}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatShortDate(poll.start_date)} - {formatShortDate(poll.end_date)} ({poll.week_year})
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Stack spacing={0.25} sx={{ minWidth: 120 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            {readyDaysCount}/{totalDaysCount} dagar spelklara
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progressPercent}
                            aria-label={`Spelklar progress: ${readyDaysCount} av ${totalDaysCount} dagar`}
                            sx={{ height: 6, borderRadius: 99 }}
                          />
                        </Stack>

                        {poll.status === "open" ? (
                          <Chip size="small" color="success" label="Öppen" sx={{ fontWeight: 600, height: 24 }} />
                        ) : (
                          <Chip size="small" label="Stängd" sx={{ fontWeight: 600, height: 24 }} />
                        )}
                      </Stack>
                    </Stack>
                  </AccordionSummary>

                  <AccordionDetails>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                      {user?.is_admin && (
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "flex-start", sm: "center" }} sx={{ width: '100%' }}>
                          <Button
                            size="small"
                            startIcon={<EmailIcon />}
                            variant="outlined"
                            sx={{ whiteSpace: "nowrap" }}
                            disabled={!mailState.canSend || sendEmailMutation.isPending}
                            onClick={() =>
                              sendEmailMutation.mutate({
                                pollId: poll.id,
                                onlyMissingVotes: Boolean(onlyMissingVotesByPoll[poll.id]),
                              })}
                          >
                            Påminn spelare
                          </Button>

                          <Tooltip title="Skicka kalenderinbjudan" arrow>
                            <span>
                              <Button
                                size="small"
                                startIcon={<EventIcon />}
                                variant="outlined"
                                sx={{ whiteSpace: "nowrap" }}
                                onClick={() => openInviteDialog(poll)}
                              >
                                Kalenderinbjudan
                              </Button>
                            </span>
                          </Tooltip>

                          <FormControlLabel
                            sx={{ ml: { xs: 0, sm: 0.5 }, whiteSpace: "nowrap" }}
                            control={(
                              <Switch
                                size="small"
                                checked={Boolean(onlyMissingVotesByPoll[poll.id])}
                                onChange={(_, checked) => {
                                  // Note for non-coders: this switch decides if reminders should skip people who already voted.
                                  setOnlyMissingVotesByPoll((prev) => ({ ...prev, [poll.id]: checked }));
                                }}
                              />
                            )}
                            label={<Typography variant="caption">Bara de som inte röstat</Typography>}
                          />

                          <Tooltip title="Fler åtgärder" arrow>
                            <IconButton
                              size="small"
                              aria-label={`Fler åtgärder för vecka ${poll.week_number}`}
                              onClick={(event) => openActionMenu(event, poll.id)}
                            >
                              <MoreVertIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>

                    {user?.is_admin && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                        {/* Note for non-coders: this helper text explains when reminder mail is allowed. */}
                        {mailState.helper}
                      </Typography>
                    )}

                    <Divider sx={{ mb: 1.5 }} />

                    <Stack spacing={1.25}>
                      {(poll.days || []).map((day) => {
                        const mySlots = normalizeVoteSlots(day, user?.id);
                        const isChecked = mySlots !== null;
                        const selectedSlots = mySlots || [];
                        const status = evaluatePollDay(day);

                        const voters = (day.votes || []).map((vote) => {
                          const profile = profileDataMap.get(vote.profile_id);
                          const slots = vote.slot_preferences && vote.slot_preferences.length > 0
                            ? vote.slot_preferences.map(s => SLOT_OPTIONS.find(o => o.value === s)?.label || s).join("/")
                            : vote.slot
                              ? SLOT_OPTIONS.find(o => o.value === vote.slot)?.label || vote.slot
                              : "hela dagen";
                          return {
                            id: vote.profile_id,
                            name: profile?.name || "Okänd spelare",
                            avatar_url: profile?.avatar_url,
                            slots,
                          };
                        });

                        return (
                          <Card
                            key={day.id}
                            variant="outlined"
                            sx={{
                              borderColor: status.isGreen ? "success.main" : "divider",
                              bgcolor: status.isGreen ? "success.light" : "background.paper",
                            }}
                          >
                            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Checkbox
                                    checked={isChecked}
                                    onChange={(e) => handleToggleDay(day, e.target.checked)}
                                    disabled={isGuest || poll.status !== "open"}
                                  />
                                  <Box>
                                    <Typography sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                      {formatFullDate(day.date)}
                                    </Typography>
                                    <Typography variant="caption" color={status.isGreen ? "success.dark" : "text.secondary"} sx={{ fontWeight: status.isGreen ? 600 : 400 }}>
                                      {status.totalVoters} {status.totalVoters === 1 ? 'röst' : 'röster'} {status.isGreen ? "• Spelklar" : "• Ej spelklar än"}
                                    </Typography>
                                  </Box>
                                </Stack>

                                <Chip
                                  size="small"
                                  label={selectedSlots.length === 0 ? "Hela dagen" : selectedSlots.map((slot) => SLOT_OPTIONS.find((o) => o.value === slot)?.label || slot).join(" + ")}
                                />
                              </Stack>

                              {isChecked && (
                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
                                  {SLOT_OPTIONS.map((option) => (
                                    <FormControlLabel
                                      key={option.value}
                                      control={
                                        <Checkbox
                                          size="small"
                                          checked={selectedSlots.includes(option.value)}
                                          onChange={() => handleToggleSlot(day, option.value, selectedSlots)}
                                          disabled={isGuest || poll.status !== "open"}
                                        />
                                      }
                                      label={option.label}
                                    />
                                  ))}
                                </Stack>
                              )}

                              {voters.length > 0 && (
                                <AvatarGroup
                                  max={10}
                                  spacing="small"
                                  sx={{
                                    mt: 1.5,
                                    justifyContent: 'flex-start',
                                    '& .MuiAvatar-root': { width: 28, height: 28, fontSize: '0.75rem', border: '2px solid #fff' }
                                  }}
                                >
                                  {voters.map((v) => (
                                    <Tooltip key={v.id} title={`${v.name} (${v.slots})`} arrow>
                                      <Box component="span">
                                        <Avatar src={v.avatar_url || undefined} name={v.name} size={28} />
                                      </Box>
                                    </Tooltip>
                                  ))}
                                </AvatarGroup>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Box>

      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={closeActionMenu}
      >
        {actionMenuPollId && (
          <MenuItem
            onClick={() => {
              setDangerPollId(actionMenuPollId);
              closeActionMenu();
            }}
          >
            Farliga åtgärder
          </MenuItem>
        )}
      </Menu>

      <Dialog open={Boolean(dangerPollId)} onClose={() => setDangerPollId(null)} fullWidth maxWidth="xs">
        <DialogTitle>Farliga åtgärder</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {/* Note for non-coders: dangerous actions can permanently remove data, so we show a dedicated warning step first. */}
            Här finns åtgärder som påverkar omröstningen permanent.
          </DialogContentText>
          {dangerPollId && (
            <Stack spacing={1}>
              {pollsSorted.find((entry) => entry.id === dangerPollId)?.status === "open" && (
                <Button
                  color="warning"
                  variant="contained"
                  onClick={() => {
                    closePollMutation.mutate(dangerPollId);
                    setDangerPollId(null);
                  }}
                >
                  Stäng omröstning
                </Button>
              )}
              <Button
                color="error"
                variant="contained"
                onClick={() => {
                  setConfirmDeletePollId(dangerPollId);
                  setDangerPollId(null);
                }}
              >
                Radera omröstning
              </Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDangerPollId(null)}>Avbryt</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={inviteDialogOpen} onClose={closeInviteDialog} fullWidth maxWidth="sm">
        <DialogTitle>Skicka kalenderinbjudan</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {/* Note for non-coders: this dialog collects the event info before sending the calendar invite email. */}
            Välj datum, start- och sluttid samt vilka spelare som ska få kalenderinbjudan.
          </DialogContentText>
          <Stack spacing={2}>
            <TextField
              select
              label="Åtgärd"
              value={inviteAction}
              onChange={(event) => setInviteAction(event.target.value as "create" | "update" | "cancel")}
              helperText="Välj skapa, uppdatera eller avbryt i kalendern."
            >
              <MenuItem value="create">Skapa</MenuItem>
              <MenuItem value="update">Uppdatera</MenuItem>
              <MenuItem value="cancel">Avbryt</MenuItem>
            </TextField>
            {invitePollId ? (
              <TextField
                select
                label="Datum"
                value={inviteDate}
                onChange={(event) => setInviteDate(event.target.value)}
                helperText="Välj vilken dag inbjudan ska gälla."
              >
                {(pollsSorted.find((poll) => poll.id === invitePollId)?.days || []).map((day) => (
                  <MenuItem key={day.id} value={day.date}>
                    {formatFullDate(day.date)}
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                type="date"
                label="Datum"
                value={inviteDate}
                onChange={(event) => setInviteDate(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Välj vilken dag inbjudan ska gälla."
              />
            )}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                type="time"
                label="Starttid"
                value={inviteStartTime}
                onChange={(event) => setInviteStartTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="När matcherna börjar."
                fullWidth
              />
              <TextField
                type="time"
                label="Sluttid"
                value={inviteEndTime}
                onChange={(event) => setInviteEndTime(event.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="När matcherna slutar."
                fullWidth
              />
            </Stack>
            <TextField
              select
              label="Bjud in spelare"
              value={inviteeProfileIds}
              onChange={(event) => {
                const next = event.target.value;
                setInviteeProfileIds(typeof next === "string" ? next.split(",") : next);
              }}
              helperText="Välj vilka spelare som ska få inbjudan."
              SelectProps={{
                multiple: true,
                renderValue: (selected) =>
                  (selected as string[])
                    .map((id) => eligibleInvitees.find((profile) => profile.id === id)?.name || "Okänd")
                    .join(", "),
              }}
            >
              {eligibleInvitees.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  <Checkbox checked={inviteeProfileIds.includes(profile.id)} />
                  <ListItemText primary={profile.name || "Okänd spelare"} />
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="caption" color="text.secondary">
              {/* Note for non-coders: updating/canceling uses the same event id so calendar apps recognize changes. */}
              Tips: Uppdatera eller avbryt genom att välja samma datum för eventet igen.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeInviteDialog}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handleSendInvite}
            disabled={
              sendCalendarInviteMutation.isPending ||
              !inviteDate ||
              !inviteStartTime ||
              !inviteEndTime ||
              inviteeProfileIds.length === 0
            }
          >
            Skicka
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(confirmDeletePollId)}
        onClose={() => setConfirmDeletePollId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Bekräfta borttagning</DialogTitle>
        <DialogContent>
          {confirmDeletePollId && (() => {
            const targetPoll = pollsSorted.find((entry) => entry.id === confirmDeletePollId);
            if (!targetPoll) return null;

            return (
              <DialogContentText>
                {/* Note for non-coders: this second confirmation exists to prevent accidental permanent deletion. */}
                Du håller på att radera Vecka {targetPoll.week_number} ({targetPoll.week_year}), {formatShortDate(targetPoll.start_date)} - {formatShortDate(targetPoll.end_date)}. Alla röster försvinner permanent.
              </DialogContentText>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeletePollId(null)}>Avbryt</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (!confirmDeletePollId) return;
              deletePollMutation.mutate(confirmDeletePollId);
              setConfirmDeletePollId(null);
            }}
          >
            Ja, radera permanent
          </Button>
        </DialogActions>
      </Dialog>
    </PullToRefresh>
  );
}
