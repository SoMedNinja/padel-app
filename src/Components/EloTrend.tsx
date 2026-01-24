import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// Färger per spelare
const playerColors = {
  Deniz: "#1f77b4",
  "Svag Rojan": "#ff7f0e",
  Parth: "#2ca02c",
  Rustam: "#d62728",
  Robert: "#9467bd",
  Gäst: "#7f7f7f"
};

export default function EloTrend({ players = [] }) {
  if (!players.length) return null;

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // 1️⃣ Samla alla datum senaste året
  const dateSet = new Set();
  players.forEach(p => {
    if (!p.history) return;
    p.history.forEach(h => {
      const d = new Date(h.date);
      if (d >= oneYearAgo) dateSet.add(h.date);
    });
  });

  const dates = Array.from(dateSet).sort(
    (a, b) => new Date(a) - new Date(b)
  );
  if (!dates.length) return null;

  // 2️⃣ Bygg grafdata
  const data = dates.map(date => {
    const row = { date };

    players.forEach(p => {
      if (p.name === "Gäst") return;

      let elo = 1000;
      if (p.history?.length) {
        const historyUpToDate = p.history
          .filter(h => new Date(h.date) <= new Date(date))
          .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (historyUpToDate.length) {
          elo = historyUpToDate.at(-1).elo;
        }
      }

      row[p.name] = elo;
    });

    return row;
  });

  const playerNames = players
    .map(p => p.name)
    .filter(name => name !== "Gäst");

  return (
    <div style={{ width: "100%", marginTop: 24 }}>
      <h2>ELO Trend (senaste året)</h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[900, "dataMax + 20"]} />
          <Tooltip />

          {playerNames.map(name => (
            <Line
              key={name}
              type="monotone"
              dataKey={(row) => row[name]}
              name={name}
              stroke={playerColors[name] || "#000"}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* ✅ EN enda legend (manuell) */}
      <div style={{ marginTop: 12 }}>
        {playerNames.map(name => (
          <span
            key={name}
            style={{
              marginRight: 16,
              display: "inline-flex",
              alignItems: "center"
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                backgroundColor: playerColors[name] || "#000",
                display: "inline-block",
                marginRight: 6
              }}
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
