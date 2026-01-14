const K = 20;

export function calculateElo(matches) {
  const players = {};

  function init(name) {
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

  matches.forEach(m => {
    const team1 = m.team1;
    const team2 = m.team2;

    team1.forEach(init);
    team2.forEach(init);

    const team1Elo =
      team1.reduce((s, p) => s + players[p].elo, 0) / team1.length;
    const team2Elo =
      team2.reduce((s, p) => s + players[p].elo, 0) / team2.length;

    const expected1 = 1 / (1 + 10 ** ((team2Elo - team1Elo) / 400));
    const expected2 = 1 - expected1;

    const team1Won = m.team1_sets > m.team2_sets;

    team1.forEach(p => {
      players[p].played++;
      if (team1Won) players[p].wins++;
      else players[p].losses++;
      players[p].elo += K * ((team1Won ? 1 : 0) - expected1);
    });

    team2.forEach(p => {
      players[p].played++;
      if (!team1Won) players[p].wins++;
      else players[p].losses++;
      players[p].elo += K * ((!team1Won ? 1 : 0) - expected2);
    });
  });

  return Object.values(players);
}
