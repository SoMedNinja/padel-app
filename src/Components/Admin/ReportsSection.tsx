import React, { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import { Share as ShareIcon, Event as EventIcon, EmojiEvents as TrophyIcon } from "@mui/icons-material";
import { useTournaments, useTournamentDetails } from "../../hooks/useTournamentData";
import { useMatches } from "../../hooks/useMatches";
import { useProfiles } from "../../hooks/useProfiles";
import { makeProfileMap, makeNameToIdMap, getProfileDisplayName } from "../../utils/profileMap";
import { calculateEveningStats } from "../../utils/reportLogic";
import { getTournamentState } from "../../utils/tournamentLogic";
import TheShareable from "../Shared/TheShareable";
import { ELO_BASELINE, calculateElo } from "../../utils/elo";
import { GUEST_ID, GUEST_NAME } from "../../utils/guest";
import { formatDate } from "../../utils/format";
import { toast } from "sonner";

export default function ReportsSection() {
  const [tab, setTab] = useState(0); // 0: Spelkväll, 1: Turnering
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareType, setShareType] = useState<"recap-evening" | "tournament">("recap-evening");
  const [shareData, setShareData] = useState<any>(null);

  const { data: tournaments = [], isLoading: isLoadingTournaments } = useTournaments();
  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();
  const { data: matches = [], isLoading: isLoadingMatches } = useMatches({ type: "all" });
  const { data: tournamentDetails, isLoading: isLoadingDetails } = useTournamentDetails(selectedTournamentId);

  const selectableProfiles = useMemo(() => {
    const hasGuest = profiles.some(p => p.id === GUEST_ID);
    if (hasGuest) return profiles;
    return [...profiles, { id: GUEST_ID, name: GUEST_NAME } as any];
  }, [profiles]);

  const profileMap = useMemo(() => makeProfileMap(selectableProfiles), [selectableProfiles]);
  const nameToIdMap = useMemo(() => makeNameToIdMap(selectableProfiles), [selectableProfiles]);

  const eloMap = useMemo(() => {
    if (!matches.length || !profiles.length) return { [GUEST_ID]: ELO_BASELINE };
    const res = calculateElo(matches, profiles);
    const map: Record<string, number> = { [GUEST_ID]: ELO_BASELINE };
    res.forEach(p => {
      map[p.id] = p.elo;
    });
    return map;
  }, [matches, profiles]);

  const handleGenerateEveningReport = () => {
    if (!selectedDate) return;
    const targetDate = new Date(selectedDate);
    const stats = calculateEveningStats(
      matches,
      targetDate,
      eloMap,
      profileMap,
      nameToIdMap
    );

    if (!stats) {
      toast.error("Inga matcher hittades för det valda datumet.");
      return;
    }

    setShareType("recap-evening");
    setShareData({
      recap: stats,
      profileMap: Object.fromEntries(
        selectableProfiles.map(p => [p.id, getProfileDisplayName(p)])
      )
    });
    setShareOpen(true);
  };

  const handleGenerateTournamentReport = () => {
    if (!selectedTournamentId || !tournamentDetails) return;

    const tournament = tournaments.find(t => t.id === selectedTournamentId);
    if (!tournament) return;

    const { standings } = getTournamentState(tournamentDetails.rounds, tournamentDetails.participants);
    const results = Object.values(standings).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.wins - a.wins;
    });

    setShareType("tournament");
    setShareData({
      tournament,
      results,
      profileMap: Object.fromEntries(
        selectableProfiles.map(p => [p.id, getProfileDisplayName(p)])
      )
    });
    setShareOpen(true);
  };

  const isLoading = isLoadingTournaments || isLoadingProfiles || isLoadingMatches;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
        <Tabs
          value={tab}
          onChange={(_, newValue) => setTab(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
          aria-label="Rapporttyper"
        >
          <Tab icon={<EventIcon />} label="Spelkväll" iconPosition="start" sx={{ py: 2, fontWeight: 700 }} />
          <Tab icon={<TrophyIcon />} label="Turnering" iconPosition="start" sx={{ py: 2, fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Paper sx={{ p: 4, borderRadius: 4 }}>
          {tab === 0 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={800} gutterBottom>Skapa kvällsrecap</Typography>
                <Typography variant="body2" color="text.secondary">
                  Välj ett datum för att generera en sammanfattning av alla matcher som spelades då.
                </Typography>
              </Box>
              <TextField
                label="Välj datum"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                startIcon={<ShareIcon />}
                onClick={handleGenerateEveningReport}
                disabled={!selectedDate}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                Generera & Dela
              </Button>
            </Stack>
          )}

          {tab === 1 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={800} gutterBottom>Skapa turneringsrapport</Typography>
                <Typography variant="body2" color="text.secondary">
                  Välj en avslutad turnering för att generera en vinnarbild och sluttabell.
                </Typography>
              </Box>
              <FormControl fullWidth>
                <InputLabel id="tournament-select-label">Välj turnering</InputLabel>
                <Select
                  labelId="tournament-select-label"
                  value={selectedTournamentId}
                  label="Välj turnering"
                  onChange={(e) => setSelectedTournamentId(e.target.value)}
                >
                  {tournaments
                    .filter(t => t.status === "completed")
                    .map(t => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name} ({formatDate(t.completed_at || t.created_at)})
                      </MenuItem>
                    ))
                  }
                  {tournaments.filter(t => t.status === "completed").length === 0 && (
                    <MenuItem disabled>Inga avslutade turneringar hittades</MenuItem>
                  )}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                size="large"
                startIcon={<ShareIcon />}
                onClick={handleGenerateTournamentReport}
                disabled={!selectedTournamentId || isLoadingDetails}
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                {isLoadingDetails ? <CircularProgress size={24} color="inherit" /> : "Generera & Dela"}
              </Button>
            </Stack>
          )}
        </Paper>
      )}

      {shareData && (
        <TheShareable
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          type={shareType}
          data={shareData}
        />
      )}
    </Box>
  );
}
