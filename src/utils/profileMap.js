import { GUEST_ID, GUEST_NAME } from "./guest";

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

export function idsToNames(ids = [], profileMap = {}) {
  return ids.map(id => profileMap[id] || (id === GUEST_ID ? GUEST_NAME : "Okänd"));
}
