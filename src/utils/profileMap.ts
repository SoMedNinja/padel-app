import { Profile } from "../types";
import { GUEST_ID, GUEST_NAME } from "./guest";

export const getProfileDisplayName = (p: Profile) => p.name || "Okänd";

export const makeProfileMap = (profiles: Profile[]) => {
  const map = new Map<string, Profile>();
  profiles.forEach(p => map.set(p.id, p));
  return map;
};

export const makeNameToIdMap = (profiles: Profile[]) => {
  const map = new Map<string, string>();
  profiles.forEach(p => map.set(getProfileDisplayName(p), p.id));
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

  return nameArray.map(name => nameToIdMap.get(name) || (name === GUEST_NAME ? GUEST_ID : null));
};

export const idsToNames = (ids: (string | null)[], profileMap: Map<string, Profile>): string[] => {
  return ids
    .filter(id => id !== undefined && id !== "")
    .map(id => getIdDisplayName(id, profileMap))
    .filter(name => name !== "Okänd");
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
    return names.split(",").map(n => n.trim()).filter(Boolean);
  }
  return [];
};
