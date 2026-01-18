const K = 20;

export function calculateElo(matches, profiles) {
  const players = {};

  profiles.forEach(p => {
    players[p.id] = {
      id: p.id,
      name: p.name,
      elo: 1000,
      wins: 0,
      losses: 0,
      history: [],
    };
  });

  matches.forEach(m => {
    const t1 = m.team1_ids;
    const t2 = m.team2_ids;

    const avg = team =>
      team.reduce((s, id) => s + players[id].elo, 0) / team.length;

    const e1 = avg(t1);
    const e2 = avg(t2);

    const exp1 = 1 / (1 + Math.pow(10, (e2 - e1) / 400));
    const team1Won = m.team1_sets > m.team2_sets;

    t1.forEach(id => {
      players[id].elo += Math.round(K * ((team1Won ? 1 : 0) - exp1));
      team1Won ? players[id].wins++ : players[id].losses++;
    });

    t2.forEach(id => {
      players[id].elo += Math.round(K * ((team1Won ? 0 : 1) - (1 - exp1)));
      team1Won ? players[id].losses++ : players[id].wins++;
    });
  });

  return Object.values(players);
}
