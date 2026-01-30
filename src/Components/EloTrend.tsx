import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { getPlayerColor } from "../utils/colors";
import { Typography, Box, Paper } from "@mui/material";
import { formatDate, formatShortDate } from "../utils/format";

export default function EloTrend({ players = [] }) {
  const { data, playerNames } = useMemo(() => {
    if (!players.length) return { data: [], playerNames: [] };

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoISO = oneYearAgo.toISOString();

    // 1️⃣ Samla alla datum senaste året (Använd ISO-strängar för snabbare jämförelse)
    const dateSet = new Set<string>();
    players.forEach(p => {
      if (!p.history) return;
      p.history.forEach(h => {
        if (h.date >= oneYearAgoISO) dateSet.add(h.date);
      });
    });

    const dates = Array.from(dateSet).sort();
    if (!dates.length) return { data: [], playerNames: [] };

    // 2️⃣ Bygg grafdata (Optimerad: O(D * P))
    // Eftersom p.history redan är sorterad kronologiskt i elo.ts kan vi använda en pekar-baserad approach.
    const playerHistoryIndices = new Map();
    players.forEach(p => playerHistoryIndices.set(p.id, 0));

    const chartData = dates.map(date => {
      const row: any = { date };

      players.forEach(p => {
        if (p.name === "Gäst") return;

        // Hitta senaste ELO fram till detta datumet utan att filtrera om hela historiken
        // p.history antas vara sorterad.
        let lastElo = p.startElo ?? 1000;
        const history = p.history || [];

        let currentIndex = playerHistoryIndices.get(p.id);
        while (currentIndex < history.length && history[currentIndex].date <= date) {
          lastElo = history[currentIndex].elo;
          currentIndex++;
        }
        playerHistoryIndices.set(p.id, currentIndex);

        row[p.name] = lastElo;
      });

      return row;
    });

    const names = players
      .map(p => p.name)
      .filter(name => name !== "Gäst");

    return { data: chartData, playerNames: names };
  }, [players]);

  if (!data.length) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>ELO Trend</Typography>
          <Typography variant="caption" color="text.secondary">Tryck och dra för att se detaljer</Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", height: 350, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <LineChart
            data={data}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => formatShortDate(val)}
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              domain={['auto', 'auto']}
              style={{ fontSize: '0.75rem' }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: 'none',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                padding: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(4px)'
              }}
              itemStyle={{ fontWeight: 700, padding: '2px 0' }}
              labelStyle={{ fontWeight: 800, color: '#d32f2f', marginBottom: '8px' }}
              labelFormatter={(val) => formatDate(val, { dateStyle: 'long' })}
              cursor={{ stroke: '#d32f2f', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {playerNames.map(name => (
              <Line
                key={name}
                type="monotone"
                dataKey={(row) => row[name]}
                name={name}
                stroke={getPlayerColor(name)}
                strokeWidth={4}
                dot={false}
                activeDot={{
                  r: 8,
                  strokeWidth: 2,
                  stroke: '#fff',
                  fill: getPlayerColor(name)
                }}
                animationDuration={1000}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      {/* ✅ EN enda legend (manuell) */}
      <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {playerNames.map(name => (
          <Box
            key={name}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              bgcolor: 'grey.50',
              px: 1.5,
              py: 0.5,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: getPlayerColor(name),
                mr: 1
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{name}</Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
