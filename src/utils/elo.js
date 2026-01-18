import { GUEST_ID, GUEST_NAME } from "./guest";

const K = 20;
const ELO_BASELINE = 1000;

export function calculateElo(matches, profiles) {
  const players = {};

  const ensurePlayer = (id, name = "Okänd") => {
    if (!players[id]) {
      players[id] = {
        id,
        name,
        elo: ELO_BASELINE,
        wins: 0,
        losses: 0,
        history: [],
      };
    }
  };

  ensurePlayer(GUEST_ID, GUEST_NAME);

  profiles.forEach(p => {
    ensurePlayer(p.id, p.name);
  });

  const normalizeTeam = (team) => (Array.isArray(team) ? team.filter(Boolean) : []);

  matches.forEach(m => {
    const t1 = normalizeTeam(m.team1_ids);
    const t2 = normalizeTeam(m.team2_ids);

    if (!t1.length || !t2.length) return;

    t1.forEach(id => ensurePlayer(id, id === GUEST_ID ? GUEST_NAME : "Okänd"));
    t2.forEach(id => ensurePlayer(id, id === GUEST_ID ? GUEST_NAME : "Okänd"));

    const avg = team => {
      const roster = normalizeTeam(team);
      if (!roster.length) return ELO_BASELINE;
      return (
        roster.reduce((s, id) => s + (players[id]?.elo ?? ELO_BASELINE), 0) / roster.length
      );
    };

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

  return Object.values(players).filter(player => player.id !== GUEST_ID);
}
