const K = 20;

export function calculateElo(matches) {
  const players = {};

  function init(name) {
    if (!name) return;
    if (!players[name]) {
      players[name] = {
        name,
        elo: 1000,
        wins: 0,
        losses: 0,
        played: 0,
      };
    }
  }

  if (!Array.isArray(matches)) return [];

  matches.forEach((m) => {
    if (!m || !m.team1 || !m.team2) return;

    const t1 = Array.isArray(m.team1) ? m.team1 : [];
    const t2 = Array.isArray(m.team2) ? m.team2 : [];

    t1.forEach(init);
    t2.forEach(init);

    const team1Won = m.team1_sets > m.team2_sets;

    t1.forEach((p) => {
      if (!p) return;
      players[p].played++;
      team1Won ? players[p].wins++ : players[p].losses++;
      players[p].elo += team1Won ? K : -K;
    });

    t2.forEach((p) => {
      if (!p) return;
      players[p].played++;
      !team1Won ? players[p].wins++ : players[p].losses++;
      players[p].elo += !team1Won ? K : -K;
    });
  });

  return Object.values(players);
}
