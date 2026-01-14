// Dynamisk ELO-beräkning
const K = 20; // Max poäng per match

export function calculateElo(matches = []) {
  const players = {};

  function init(name) {
    if (!name) return;
    if (!players[name]) {
      players[name] = { name, elo: 1000, wins: 0, losses: 0, played: 0 };
    }
  }

  matches.forEach((m, i) => {
    if (
      !m ||
      !Array.isArray(m.team1) ||
      !Array.isArray(m.team2) ||
      m.team1_sets == null ||
      m.team2_sets == null
    ) {
      console.warn("Skipping invalid match", i, m);
      return;
    }

    const t1 = m.team1 || [];
    const t2 = m.team2 || [];

    t1.forEach(init);
    t2.forEach(init);

    const team1Elo = t1.reduce((sum, p) => sum + players[p].elo, 0) / t1.length;
    const team2Elo = t2.reduce((sum, p) => sum + players[p].elo, 0) / t2.length;

    const expected1 = 1 / (1 + Math.pow(10, (team2Elo - team1Elo) / 400));
    const expected2 = 1 - expected1;

    const team1Won = m.team1_sets > m.team2_sets ? 1 : 0;
    const team2Won = 1 - team1Won;

    t1.forEach((p) => {
      players[p].played++;
      if (team1Won) players[p].wins++;
      else players[p].losses++;

      players[p].elo += Math.round(K * (team1Won - expected1));
    });

    t2.forEach((p) => {
      players[p].played++;
      if (team2Won) players[p].wins++;
      else players[p].losses++;

      players[p].elo += Math.round(K * (team2Won - expected2));
    });
  });

  return Object.values(players);
}
