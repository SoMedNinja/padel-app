import { GUEST_ID, GUEST_NAME } from "./guest";

export function makeProfileMap(profiles = []) {
  // { "<uuid>": "Parth", "<uuid>": "Deniz", ... }
  const map = { [GUEST_ID]: GUEST_NAME };
  profiles.forEach(p => {
    map[p.id] = p.name;
  });
  return map;
}

export function idsToNames(ids = [], profileMap = {}) {
  return ids.map(id => profileMap[id] || (id === GUEST_ID ? GUEST_NAME : "Okänd"));
}
