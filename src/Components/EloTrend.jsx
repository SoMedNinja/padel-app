import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

// Färger för spelare – justera efter behov
const playerColors = {
  "Deniz": "#1f77b4",
  "Svag Rojan": "#ff7f0e",
  "Parth": "#2ca02c",
  "Rustam": "#d62728",
  "Robert": "#9467bd",
  "Gäst": "#7f7f7f"
};

export default function EloTrend({ players = [] }) {
  if (!players.length) return null;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 1️⃣ Samla alla datum inom senaste året
  const allDatesSet = new Set();
  players.forEach(p => {
    if (!p.history) return;
    p.history.forEach(({ date }) => {
      const d = new Date(date);
      if (d >= oneYearAgo) allDatesSet.add(date);
    });
  });

  // Konvertera och sortera datum
  const allDates = Array.from(allDatesSet).sort((a, b) => new Date(a) - new Date(b));

  if (!allDates.length) return null;

  // 2️⃣ Bygg data array med alla spelare
  const data = allDates.map(date => {
    const entry = { date };
    players.forEach(p => {
      if (p.name === "Gäst") return;

      // Hitta senaste elo upp till detta datum
      let lastElo = 1000;
      if (p.history && p.history.length) {
        const h = p.history
          .filter(hd => new Date(hd.date) <= new Date(date))
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        if (h.length) lastElo = h[h.length - 1].elo;
      }

      entry[p.name] = lastElo;
    });
    return entry;
  });

  const playerNames = Object.keys(players.reduce((acc, p) => {
    if (p.name !== "Gäst") acc[p.name] = true;
    return acc;
  }, {}));

  return (
    <div style={{ width: "100%", marginTop: 20 }}>
      <h2>ELO Trend (senaste året)</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[900, 'dataMax']} /> {/* Y börjar vid 900 för jämnhet */}
          <Tooltip />
          <Legend />
          {playerNames.map(name => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={playerColors[name] || "#000"}
              dot={false}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 10 }}>
        {playerNames.map(name => (
          <span key={name} style={{ marginRight: 15, display: "inline-flex", alignItems: "center" }}>
            <span style={{ width: 12, height: 12, backgroundColor: playerColors[name] || "#000", display: "inline-block", marginRight: 4 }}></span>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
