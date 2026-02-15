import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { getPlayerColor } from "../utils/colors";
import { Typography, Box, Paper, TextField, Stack, InputAdornment, IconButton, Tooltip as MuiTooltip } from "@mui/material";
import { Autorenew as ResetIcon } from "@mui/icons-material";
import { formatDate, formatShortDate } from "../utils/format";

export default function EloTrend({ players = [] }) {
  const { data, playerNames, minDateISO, maxDateISO } = useMemo(() => {
    if (!players.length) return { data: [], playerNames: [], minDateISO: null, maxDateISO: null };

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
    if (!dates.length) return { data: [], playerNames: [], minDateISO: null, maxDateISO: null };

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

    return {
      data: chartData,
      playerNames: names,
      minDateISO: dates[0],
      maxDateISO: dates[dates.length - 1]
    };
  }, [players]);

  const toInputDate = (isoDate: string | null) => {
    if (!isoDate) return "";
    return new Date(isoDate).toISOString().slice(0, 10);
  };

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [hasCustomRange, setHasCustomRange] = useState(false);
  const [legendOverlayState, setLegendOverlayState] = useState<{
    label: string;
    values: Array<{ name: string; color: string; value: number | null }>;
    panelSide: "left" | "right";
    panelVertical: "top" | "bottom";
  } | null>(null);

  useEffect(() => {
    // Note for non-coders: we only auto-fill dates before the user customizes the range.
    if (!hasCustomRange && !startDate && minDateISO) setStartDate(toInputDate(minDateISO));
  }, [hasCustomRange, minDateISO, startDate]);

  useEffect(() => {
    // Note for non-coders: this keeps the default range unless the user clears it.
    if (!hasCustomRange && !endDate && maxDateISO) setEndDate(toInputDate(maxDateISO));
  }, [endDate, hasCustomRange, maxDateISO]);

  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return data;

    const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
    const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

    return data.filter(row => {
      const rowDate = new Date(row.date);
      if (start && rowDate < start) return false;
      if (end && rowDate > end) return false;
      return true;
    });
  }, [data, endDate, startDate]);

  const yDomain = useMemo(() => {
    // Note for non-coders: we calculate the y-axis range from the chosen dates without recalculating ELO.
    if (!filteredData.length) return ["auto", "auto"] as const;

    let min = Infinity;
    let max = -Infinity;

    filteredData.forEach(row => {
      playerNames.forEach(name => {
        const value = row[name];
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) return ["auto", "auto"] as const;

    const padding = Math.max(5, Math.round((max - min) * 0.05));
    return [min - padding, max + padding] as const;
  }, [filteredData, playerNames]);

  const buildLegendValues = (row: any) => {
    return playerNames.map((name) => ({
      name,
      color: getPlayerColor(name),
      value: typeof row?.[name] === "number" ? row[name] : null,
    }));
  };

  const latestLegendOverlayState = useMemo(() => {
    if (!filteredData.length) return null;
    const latestRow = filteredData[filteredData.length - 1];

    return {
      label: latestRow.date,
      values: buildLegendValues(latestRow),
      panelSide: "right" as const,
      panelVertical: "top" as const,
    };
  }, [filteredData, playerNames]);

  useEffect(() => {
    setLegendOverlayState(latestLegendOverlayState);
  }, [latestLegendOverlayState]);

  if (!data.length) return null;
  const getTodayDateString = () => new Date().toISOString().slice(0, 10);



  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 4, mt: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>ELO Trend</Typography>
          <Typography variant="caption" color="text.secondary">Tryck och dra för att se detaljer</Typography>
        </Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
        >
          <TextField
            id="elo-trend-start-date"
            label="Startdatum"
            aria-label="Välj startdatum för ELO-trend"
            type="date"
            size="small"
            value={startDate}
            onChange={(event) => {
              setHasCustomRange(true);
              setStartDate(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            InputProps={{
              endAdornment: startDate ? (
                <InputAdornment position="end">
                  <MuiTooltip title="Återställ till tidigaste datum" arrow>
                    <IconButton
                      aria-label="Återställ startdatum"
                      size="small"
                      onClick={() => {
                        // Note for non-coders: resetting uses the earliest data we have, not an empty value.
                        setHasCustomRange(true);
                        setStartDate(minDateISO ? toInputDate(minDateISO) : "");
                      }}
                    >
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </MuiTooltip>
                </InputAdornment>
              ) : undefined
            }}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
          />
          <TextField
            id="elo-trend-end-date"
            label="Slutdatum"
            aria-label="Välj slutdatum för ELO-trend"
            type="date"
            size="small"
            value={endDate}
            onChange={(event) => {
              setHasCustomRange(true);
              setEndDate(event.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            InputProps={{
              endAdornment: endDate ? (
                <InputAdornment position="end">
                  <MuiTooltip title="Återställ till idag" arrow>
                    <IconButton
                      aria-label="Återställ slutdatum"
                      size="small"
                      onClick={() => {
                        // Note for non-coders: end date resets to today so the chart includes the latest days.
                        setHasCustomRange(true);
                        setEndDate(getTodayDateString());
                      }}
                    >
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </MuiTooltip>
                </InputAdornment>
              ) : undefined
            }}
            sx={{ width: { xs: "100%", sm: "auto" }, minWidth: { sm: 160 } }}
          />
        </Stack>
      </Stack>

      <Box sx={{ width: "100%", height: 350, minWidth: 0, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <LineChart
            data={filteredData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            onMouseMove={(state: any) => {
              if (!state?.isTooltipActive || !state?.activeLabel) return;

              const row = filteredData.find((entry) => entry.date === state.activeLabel);
              if (!row) return;

              setLegendOverlayState({
                label: state.activeLabel,
                values: buildLegendValues(row),
                panelSide: state.chartX > state.chartWidth / 2 ? "left" : "right",
                panelVertical: state.chartY > state.chartHeight / 2 ? "top" : "bottom",
              });
            }}
            onMouseLeave={() => {
              setLegendOverlayState(latestLegendOverlayState);
            }}
            onTouchMove={(state: any) => {
              if (!state?.isTooltipActive || !state?.activeLabel) return;

              const row = filteredData.find((entry) => entry.date === state.activeLabel);
              if (!row) return;

              setLegendOverlayState({
                label: state.activeLabel,
                values: buildLegendValues(row),
                panelSide: state.chartX > state.chartWidth / 2 ? "left" : "right",
                panelVertical: state.chartY > state.chartHeight / 2 ? "top" : "bottom",
              });
            }}
            onTouchEnd={() => {
              setLegendOverlayState(latestLegendOverlayState);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis
              dataKey="date"
              tickFormatter={(val) => formatShortDate(val)}
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis
              domain={yDomain}
              style={{ fontSize: '0.75rem' }}
            />
            <RechartsTooltip
              content={() => null}
              position={{ x: 16, y: 16 }}
              wrapperStyle={{ pointerEvents: 'none', zIndex: 20 }}
              cursor={{ stroke: '#d32f2f', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {playerNames.map(name => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
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

        {legendOverlayState ? (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: legendOverlayState.panelVertical === 'top' ? 8 : 'auto',
              bottom: legendOverlayState.panelVertical === 'bottom' ? 8 : 'auto',
              left: legendOverlayState.panelSide === 'left' ? 8 : 'auto',
              right: legendOverlayState.panelSide === 'right' ? 8 : 'auto',
              maxWidth: 260,
              p: 1.25,
              borderRadius: 2,
              pointerEvents: 'none',
              bgcolor: 'rgba(255,255,255,0.96)',
              zIndex: 2,
            }}
          >
            {/* Note for non-coders: this floating legend jumps to the opposite side of your finger so values stay visible while you drag on the chart. */}
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main', display: 'block', mb: 0.5 }}>
              {formatDate(legendOverlayState.label, { dateStyle: 'long' })}
            </Typography>
            {legendOverlayState.values.map((entry) => (
              <Typography key={entry.name} variant="caption" sx={{ display: 'block', color: entry.color, fontWeight: 700 }}>
                {entry.name}: {typeof entry.value === 'number' ? Math.round(entry.value) : '—'}
              </Typography>
            ))}
          </Paper>
        ) : null}
      </Box>
    </Paper>
  );
}
