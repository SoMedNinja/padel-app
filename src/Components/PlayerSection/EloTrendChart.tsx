import { useState, useMemo, useEffect, ReactNode } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Card,
  CardContent,
  Box,
  Stack,
  Typography,
  Tooltip as MuiTooltip,
  IconButton,
  Chip,
  TextField,
  FormControlLabel,
  Switch,
  MenuItem,
  Paper,
} from "@mui/material";
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from "@mui/icons-material";
import { alpha } from "@mui/material/styles";
import { Profile, PlayerStats } from "../../types";
import { getProfileDisplayName } from "../../utils/profileMap";
import { formatChartTimestamp } from "../../utils/format";
import { buildComparisonChartData } from "../../utils/playerStats";
import ProfileName from "../ProfileName";

const renderPlayerOptionLabel = (profile: Profile | null | undefined): ReactNode => {
  if (!profile) return "Okänd";
  const baseName = getProfileDisplayName(profile);
  return <ProfileName name={baseName} badgeId={profile.featured_badge_id} />;
};

interface EloTrendChartProps {
  user: any;
  allEloPlayers: PlayerStats[];
  profiles: Profile[];
  selectablePlayers: Profile[];
}

export default function EloTrendChart({
  user,
  allEloPlayers,
  profiles,
  selectablePlayers,
}: EloTrendChartProps) {
  const [compareTarget, setCompareTarget] = useState<string>("none");
  const [isEloChartFullscreen, setIsEloChartFullscreen] = useState(false);
  const [trendTimeRange, setTrendTimeRange] = useState<string>("year1");
  const [showWinRate, setShowWinRate] = useState(false);
  const [eloTrendStartDate, setEloTrendStartDate] = useState<string>("");
  const [eloTrendEndDate, setEloTrendEndDate] = useState<string>("");
  const [eloTrendRangeTouched, setEloTrendRangeTouched] = useState(false);

  const comparisonIds = useMemo(() => {
    if (!user?.id) return [];
    if (compareTarget === "all") {
      return [user.id, ...selectablePlayers.map(player => player.id)];
    }
    if (compareTarget && compareTarget !== "none") {
      return [user.id, compareTarget].filter(Boolean);
    }
    return [user.id];
  }, [compareTarget, selectablePlayers, user]);

  const comparisonData = useMemo(
    () => buildComparisonChartData(allEloPlayers, profiles, comparisonIds),
    [allEloPlayers, profiles, comparisonIds]
  );

  const comparisonNames = useMemo(() => {
    const profileNameMap = profiles.reduce((acc, profile) => {
      acc[profile.id] = getProfileDisplayName(profile);
      return acc;
    }, {} as Record<string, string>);
    return comparisonIds.map(id => profileNameMap[id] || "Okänd");
  }, [comparisonIds, profiles]);

  const comparisonDateLabels = useMemo(() => {
    const map = new Map<string, string>();
    let lastDate = "";
    comparisonData.forEach(row => {
      if (!row.date) return;
      const dateKey = row.date.split("T")[0];
      if (!dateKey) return;
      if (dateKey !== lastDate) {
        map.set(row.date, formatChartTimestamp(dateKey));
        lastDate = dateKey;
      } else {
        map.set(row.date, "");
      }
    });
    return map;
  }, [comparisonData]);

  const toInputDate = (isoDate: string | null) => {
    if (!isoDate) return "";
    return new Date(isoDate).toISOString().slice(0, 10);
  };

  const { minComparisonDate, maxComparisonDate } = useMemo(() => {
    if (!comparisonData.length) return { minComparisonDate: null, maxComparisonDate: null };
    return {
      minComparisonDate: comparisonData[0].date ?? null,
      maxComparisonDate: comparisonData[comparisonData.length - 1].date ?? null,
    };
  }, [comparisonData]);

  useEffect(() => {
    if (!minComparisonDate || !maxComparisonDate) {
      setEloTrendStartDate("");
      setEloTrendEndDate("");
      setEloTrendRangeTouched(false);
      return;
    }
    if (eloTrendRangeTouched) return;
    // Note for non-coders: we only auto-fill the range before the user makes their own choice.
    const minDateInput = toInputDate(minComparisonDate);
    const maxDateInput = toInputDate(maxComparisonDate);
    setEloTrendStartDate((prev) => prev || minDateInput);
    setEloTrendEndDate((prev) => prev || maxDateInput);
  }, [eloTrendRangeTouched, maxComparisonDate, minComparisonDate]);

  const filteredComparisonData = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    const now = new Date();

    if (trendTimeRange === "custom") {
      start = eloTrendStartDate ? new Date(`${eloTrendStartDate}T00:00:00`) : null;
      end = eloTrendEndDate ? new Date(`${eloTrendEndDate}T23:59:59`) : null;
    } else {
      end = now;
      if (trendTimeRange === "days30") {
        start = new Date(now);
        start.setDate(now.getDate() - 30);
      } else if (trendTimeRange === "days90") {
        start = new Date(now);
        start.setDate(now.getDate() - 90);
      } else if (trendTimeRange === "year1") {
        start = new Date(now);
        start.setFullYear(now.getFullYear() - 1);
      }
    }

    return comparisonData.filter(row => {
      const rowDate = new Date(row.date);
      if (start && rowDate < start) return false;
      if (end && rowDate > end) return false;
      return true;
    });
  }, [comparisonData, trendTimeRange, eloTrendStartDate, eloTrendEndDate]);

  const comparisonYDomain = useMemo(() => {
    if (!filteredComparisonData.length) return ["dataMin - 20", "dataMax + 20"] as const;

    let min = Infinity;
    let max = -Infinity;

    filteredComparisonData.forEach(row => {
      comparisonNames.forEach(name => {
        const value = row[`${name}_elo`];
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) return ["dataMin - 20", "dataMax + 20"] as const;

    const padding = Math.max(5, Math.round((max - min) * 0.05));
    return [min - padding, max + padding] as const;
  }, [comparisonNames, filteredComparisonData]);

  useEffect(() => {
    // Lock the page scroll while the full-screen chart is open so it feels like a modal.
    document.body.classList.toggle("chart-fullscreen-active", isEloChartFullscreen);
    return () => {
      document.body.classList.remove("chart-fullscreen-active");
    };
  }, [isEloChartFullscreen]);

  const chartPalette = ["#d32f2f", "#1976d2", "#388e3c", "#f57c00", "#7b1fa2", "#00796b"];
  const [chartTooltipState, setChartTooltipState] = useState<{
    label: string;
    values: Array<{ name: string; value: number; color: string }>;
    panelSide: "left" | "right";
  } | null>(null);
  const [isChartTooltipLocked, setIsChartTooltipLocked] = useState(false);

  const buildLegendValues = (row: any) => {
    const values = comparisonNames.map((name, index) => ({
      name,
      value: row[`${name}_elo`],
      color: chartPalette[index % chartPalette.length]
    }));

    if (showWinRate && comparisonNames.length > 0) {
      values.push({
        name: "Vinst %",
        value: row[`${comparisonNames[0]}_winRate`],
        color: "#ff9800"
      });
    }

    return values
      .map(v => ({ ...v, name: String(v.name), value: Number(v.value), color: String(v.color) }))
      .filter(v => v.name && Number.isFinite(v.value));
  };

  const updateChartTooltip = (state: any) => {
    if (!state?.isTooltipActive || !state?.activeLabel) return;

    // Note for non-coders: this ensures we get the exact data point even if the user is slightly off,
    // which fixes the "tooltip doesn't show up" issue on touch screens.
    const row = filteredComparisonData.find(d => d.date === state.activeLabel);
    if (!row) return;

    const values = buildLegendValues(row);
    if (!values.length) return;

    const chartWidth = Number(state.chartWidth) || 0;
    const chartX = Number(state.chartX) || 0;
    const panelSide: "left" | "right" = chartX < chartWidth * 0.5 ? "right" : "left";

    setChartTooltipState({
      label: String(state.activeLabel),
      values,
      panelSide,
    });
  };

  const unlockChartTooltip = () => {
    setIsChartTooltipLocked(false);
    setChartTooltipState(null);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        ...(isEloChartFullscreen && {
          position: 'fixed',
          inset: 0,
          zIndex: 1300,
          borderRadius: 0,
          m: 0,
          p: 2,
        })
      }}
    >
      <CardContent sx={{ height: isEloChartFullscreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction="column"
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>Trend-analys</Typography>
            <MuiTooltip title={isEloChartFullscreen ? "Stäng helskärm" : "Visa i helskärm"} arrow>
              <IconButton
                onClick={() => setIsEloChartFullscreen(!isEloChartFullscreen)}
                aria-label={isEloChartFullscreen ? "Stäng helskärm" : "Visa i helskärm"}
              >
                {isEloChartFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </MuiTooltip>
          </Box>

          <Stack direction="row" spacing={1} overflow="auto" sx={{ pb: 1, '&::-webkit-scrollbar': { display: 'none' } }}>
            {[
              { id: 'days30', label: '30d' },
              { id: 'days90', label: '90d' },
              { id: 'year1', label: '1y' },
              { id: 'all', label: 'Alla' },
              { id: 'custom', label: 'Anpassat' }
            ].map((range) => (
              <Chip
                key={range.id}
                label={range.label}
                onClick={() => setTrendTimeRange(range.id)}
                color={trendTimeRange === range.id ? "primary" : "default"}
                variant={trendTimeRange === range.id ? "filled" : "outlined"}
                size="small"
                sx={{ fontWeight: 700 }}
              />
            ))}
          </Stack>

          {trendTimeRange === "custom" && (
            <Stack direction="row" spacing={2}>
              <TextField
                id="elo-trend-start-date"
                label="Från"
                type="date"
                size="small"
                value={eloTrendStartDate}
                onChange={(e) => { setEloTrendRangeTouched(true); setEloTrendStartDate(e.target.value); }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
              <TextField
                id="elo-trend-end-date"
                label="Till"
                type="date"
                size="small"
                value={eloTrendEndDate}
                onChange={(e) => { setEloTrendRangeTouched(true); setEloTrendEndDate(e.target.value); }}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ flex: 1 }}
              />
            </Stack>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={showWinRate}
                  onChange={(e) => setShowWinRate(e.target.checked)}
                  size="small"
                />
              }
              label="Visa vinst %"
              sx={{ mr: 2, whiteSpace: 'nowrap' }}
            />

            <TextField
              select
              size="small"
              label="Jämför med"
              value={compareTarget}
              onChange={(e) => setCompareTarget(e.target.value)}
              sx={{ minWidth: 160, flex: { sm: 1 } }}
            >
              <MenuItem value="none">Ingen</MenuItem>
              <MenuItem value="all">Alla</MenuItem>
              {selectablePlayers.map(player => (
                <MenuItem key={player.id} value={player.id}>
                  {renderPlayerOptionLabel(player)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </Stack>

        <Box sx={{ height: isEloChartFullscreen ? 'auto' : 300, flex: isEloChartFullscreen ? 1 : 'none', minHeight: 300, width: '100%', mt: 2, position: 'relative' }}>
          {comparisonData.length ? (
            <ResponsiveContainer
              key={isEloChartFullscreen ? 'fs' : 'normal'}
              width="100%"
              height="100%"
              minWidth={0}
              minHeight={0}
              debounce={50}
            >
              <LineChart
                data={filteredComparisonData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                onMouseMove={(state) => {
                  updateChartTooltip(state);
                }}
                onTouchStart={(state) => {
                  updateChartTooltip(state);
                }}
                onTouchMove={(state) => {
                  updateChartTooltip(state);
                }}
                onMouseLeave={() => {
                  if (!isChartTooltipLocked) {
                    setChartTooltipState(null);
                  }
                }}
                onClick={(state) => {
                  if (isChartTooltipLocked) {
                    unlockChartTooltip();
                  } else {
                    updateChartTooltip(state);
                    setIsChartTooltipLocked(true);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => comparisonDateLabels.get(value) ?? ""}
                />
                <YAxis yAxisId="elo" domain={comparisonYDomain} />
                <YAxis
                  yAxisId="winRate"
                  orientation="right"
                  domain={[0, 100]}
                  hide={!showWinRate}
                  tick={{ fontSize: '0.75rem', fill: '#ff9800' }}
                />
                <Tooltip content={() => null} cursor={{ stroke: '#d32f2f', strokeDasharray: '4 4' }} />
                <Legend verticalAlign="bottom" />
                {chartTooltipState?.label ? (
                  <ReferenceLine
                    x={chartTooltipState.label}
                    stroke="#d32f2f"
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                    yAxisId="elo"
                  />
                ) : null}
                {comparisonNames.map((name, index) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={(row) => row[`${name}_elo`]}
                    name={name}
                    stroke={chartPalette[index % chartPalette.length]}
                    strokeWidth={3}
                    dot={false}
                    animationDuration={300}
                    yAxisId="elo"
                  />
                ))}
                {showWinRate && comparisonNames.length > 0 && (
                  <Line
                    key="user-winRate"
                    type="monotone"
                    dataKey={(row) => row[`${comparisonNames[0]}_winRate`]}
                    name="Vinst %"
                    stroke="#ff9800"
                    strokeWidth={3}
                    dot={false}
                    strokeDasharray="5 5"
                    animationDuration={300}
                    yAxisId="winRate"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 8 }}>
              Spela matcher senaste året för att se ELO-utvecklingen.
            </Typography>
          )}

          {chartTooltipState ? (
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: 8,
                left: chartTooltipState.panelSide === "left" ? 8 : "auto",
                right: chartTooltipState.panelSide === "right" ? 8 : "auto",
                maxWidth: 260,
                p: 1.5,
                borderRadius: 3,
                pointerEvents: 'none',
                bgcolor: (theme) => alpha(theme.palette.background.paper, 0.85),
                backdropFilter: 'blur(12px)',
                zIndex: 2,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mb: 1, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                {formatChartTimestamp(chartTooltipState.label, true)}
              </Typography>
              <Stack spacing={0.5}>
                {chartTooltipState.values.map((entry) => (
                  <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 140 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary', flexGrow: 1 }}>
                      {entry.name}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', tabularNums: true }}>
                      {Math.round(entry.value)}
                    </Typography>
                  </Box>
                ))}
                {isChartTooltipLocked ? (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary', fontStyle: 'italic' }}>
                    Tryck på grafen igen för att rensa.
                  </Typography>
                ) : null}
              </Stack>
            </Paper>
          ) : null}
        </Box>
      </CardContent>
    </Card>
  );
}
