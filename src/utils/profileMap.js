export function makeProfileMap(profiles = []) {
  // { "<uuid>": "Parth", "<uuid>": "Deniz", ... }
  const map = {};
  profiles.forEach(p => {
    map[p.id] = p.name;
  });
  return map;
}

export function idsToNames(ids = [], profileMap = {}) {
  return ids.map(id => profileMap[id] || "Okänd");
}
