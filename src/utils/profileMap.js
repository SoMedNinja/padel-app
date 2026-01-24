import { GUEST_ID, GUEST_NAME } from "./guest";

const normalizeName = (name) => name?.trim().toLowerCase();

export function getProfileDisplayName(profile) {
  return profile?.name || profile?.email || "Okänd";
}

export function makeProfileMap(profiles = []) {
  // { "<uuid>": "Parth", "<uuid>": "Deniz", ... }
  const map = { [GUEST_ID]: GUEST_NAME };
  profiles.forEach(p => {
    map[p.id] = getProfileDisplayName(p);
  });
  return map;
}

export function makeNameToIdMap(profiles = []) {
  const map = { [normalizeName(GUEST_NAME)]: GUEST_ID };
  profiles.forEach(p => {
    const name = getProfileDisplayName(p);
    const key = normalizeName(name);
    if (key && !map[key]) {
      map[key] = p.id;
    }
  });
  return map;
}

export function idsToNames(ids = [], profileMap = {}) {
  return ids.map(id => {
    if (id === null || id === GUEST_ID) return GUEST_NAME;
    return profileMap[id] || "Okänd";
  });
}

export function namesToIds(names = [], nameToIdMap = {}) {
  return names
    .map(name => {
      if (!name) return null;
      const key = normalizeName(name);
      if (key && nameToIdMap[key]) return nameToIdMap[key];
      return `name:${name}`;
    })
    .filter(Boolean);
}

export function resolveTeamIds(teamIds = [], teamNames = [], nameToIdMap = {}) {
  const ids = Array.isArray(teamIds) ? teamIds.filter(Boolean) : [];
  if (ids.length) return ids;
  const names = Array.isArray(teamNames) ? teamNames.filter(Boolean) : [];
  return namesToIds(names, nameToIdMap);
}

export function resolveTeamNames(teamIds = [], teamNames = [], profileMap = {}) {
  const ids = Array.isArray(teamIds) ? teamIds : [];
  const names = Array.isArray(teamNames) ? teamNames : [];

  if (ids.some(Boolean)) {
    return ids
      .map((id, index) => {
        if (id) return getIdDisplayName(id, profileMap);
        if (names[index]) return names[index];
        return id === GUEST_ID ? GUEST_NAME : "Okänd";
      })
      .filter(Boolean);
  }

  return names.filter(Boolean);
}

export function getIdDisplayName(id, profileMap = {}) {
  if (id === null || id === GUEST_ID) return GUEST_NAME;
  if (profileMap[id]) return profileMap[id];
  if (typeof id === "string" && id.startsWith("name:")) return id.slice(5);
  return "Okänd";
}
