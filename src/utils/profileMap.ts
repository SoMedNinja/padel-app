import { Profile } from "../types";
import { GUEST_ID, GUEST_NAME } from "./guest";

export const getProfileDisplayName = (p: Profile) => p.name || "Okänd";

export const normalizeProfileName = (name: string) => name.trim().toLowerCase();
// Note for non-coders: historical matches may store guest names with slightly different spelling/casing.
// We keep a small alias list so old data still resolves to the same "guest" player consistently.
const GUEST_NAME_ALIASES = new Set([
  normalizeProfileName(GUEST_NAME),
  normalizeProfileName("gäst"),
  normalizeProfileName("gästspelare"),
  normalizeProfileName("guest"),
  normalizeProfileName("guest player"),
]);

export const makeProfileMap = (profiles: Profile[]) => {
  const map = new Map<string, Profile>();
  profiles.forEach(p => map.set(p.id, p));
  return map;
};

export const makeNameToIdMap = (profiles: Profile[]) => {
  const map = new Map<string, string>();
  profiles.forEach((p) => {
    const displayName = getProfileDisplayName(p);
    map.set(displayName, p.id);
    map.set(normalizeProfileName(displayName), p.id);
  });
  return map;
};

export const getIdDisplayName = (id: string | null, profileMap: Map<string, Profile>) => {
  if (id === GUEST_ID || !id) return GUEST_NAME;
  if (id.startsWith("name:")) return id.replace("name:", "");
  const p = profileMap.get(id);
  return p ? getProfileDisplayName(p) : "Okänd";
};

export const resolveTeamIds = (
  ids: (string | null)[] | undefined,
  names: string | string[] | undefined,
  nameToIdMap: Map<string, string>
): (string | null)[] => {
  if (ids && ids.length > 0) return ids;

  let nameArray: string[] = [];
  if (Array.isArray(names)) {
    nameArray = names;
  } else if (typeof names === "string") {
    nameArray = names.split(",").map(n => n.trim()).filter(Boolean);
  }
  return nameArray.map((name) => {
    // Optimization: Check for direct match first to avoid expensive normalization
    const directMatch = nameToIdMap.get(name);
    if (directMatch) return directMatch;

    const normalizedName = normalizeProfileName(name);
    const normMatch = nameToIdMap.get(normalizedName);
    if (normMatch) return normMatch;

    return GUEST_NAME_ALIASES.has(normalizedName) ? GUEST_ID : null;
  });
};

export const idsToNames = (ids: (string | null)[], profileMap: Map<string, Profile>): string[] => {
  const result: string[] = [];
  // Optimization: Single pass with O(N) instead of multiple .filter().map().filter()
  // This avoids intermediate array allocations and redundant iterations.
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (id !== undefined && id !== null && id !== "") {
      const name = getIdDisplayName(id, profileMap);
      if (name !== "Okänd") {
        result.push(name);
      }
    }
  }
  return result;
};

export const resolveTeamNames = (
  ids: (string | null)[] | undefined,
  names: string | string[] | undefined,
  profileMap: Map<string, Profile>
): string[] => {
  if (ids && ids.length > 0) {
    return idsToNames(ids, profileMap);
  }

  if (Array.isArray(names)) return names;
  if (typeof names === "string") {
    const trimmed = names.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed.split(",").map(n => n.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

export const getTournamentStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: "Utkast",
    in_progress: "Pågår",
    completed: "Avslutad",
    abandoned: "Avbruten",
  };
  return labels[status] || "Okänd";
};
