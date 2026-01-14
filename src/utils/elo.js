const K = 20;

export function calculateElo(matches) {
  const players = {};
  function init(name) {
    if (!name) return;
    if (!players[name]) players[name] = { name, elo: 1000, wins: 0, losses: 0, played: 0 };
  }
  matches.forEach((m) => {
    if (!m || !Array.isArray(m.team1) || !Array.isArray(m.team2) || m.team1_sets == null || m.team2_sets == null) return;
    m.team1.forEach(init);
    m.team2.forEach(init);
    const team1Won = m.team1_sets > m.team2_sets;
    m.team1.forEach(p => { if (!p) return; players[p].played++; team1Won ? players[p].wins++ : players[p].losses++; players[p].elo += team1Won ? K : -K });
    m.team2.forEach(p => { if (!p) return; players[p].played++; !team1Won ? players[p].wins++ : players[p].losses++; players[p].elo += !team1Won ? K : -K });
  });
  return Object.values(players);
}
