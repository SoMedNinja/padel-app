import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  Skeleton,
  Box,
  Typography,
  Grid,
  Stack,
  Chip,
  Tabs,
  Tab,
  useMediaQuery,
} from "@mui/material";
import { toast } from "sonner";
import TheShareable from "./Shared/TheShareable";
import { GUEST_ID, GUEST_NAME } from "../utils/guest";
import { useTournaments, useTournamentDetails } from "../hooks/useTournamentData";
import { useQueryClient } from "@tanstack/react-query";
import { tournamentService } from "../services/tournamentService";
import { matchService } from "../services/matchService";
import {
  getProfileDisplayName,
  getTournamentStatusLabel,
  idsToNames,
  makeProfileMap,
} from "../utils/profileMap";
import {
  getTournamentState,
  getNextSuggestion,
  generateAmericanoRounds,
} from "../utils/tournamentLogic";
import { Profile, PlayerStats, TournamentRound } from "../types";
import AppAlert from "./Shared/AppAlert";
import { useTheme } from "@mui/material/styles";
import { invalidateTournamentData, refetchTournamentDetails } from "../data/queryInvalidation";
import { getAuthErrorMessage } from "../utils/authErrorMapper";

import TournamentConfig from "./Tournament/TournamentConfig";
import ActiveRound from "./Tournament/ActiveRound";
import LiveStandings from "./Tournament/LiveStandings";
import TournamentResults from "./Tournament/TournamentResults";
import TournamentHistory from "./Tournament/TournamentHistory";

const SCORE_TARGET_DEFAULT = 24;

const toDateInput = (value: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

interface MexicanaTournamentProps {
  user: any;
  profiles?: Profile[];
  eloPlayers?: PlayerStats[];
  isGuest?: boolean;
  onTournamentSync?: () => void;
}

export default function MexicanaTournament({
  user,
  profiles = [],
  isGuest = false,
  onTournamentSync,
}: MexicanaTournamentProps) {
  const queryClient = useQueryClient();
  const [activeTournamentId, setActiveTournamentId] = useState("");
  const lastRedirectRef = useRef("");
  const [shareOpen, setShareOpen] = useState(false);
  const {
    data: tournaments = [],
    isLoading: isLoadingTournaments,
    isError: isTournamentListError,
    error: tournamentListError,
  } = useTournaments();
  const {
    data: tournamentData,
    isLoading: isLoadingDetails,
    isError: isTournamentDetailsError,
    error: tournamentDetailsError,
  } = useTournamentDetails(activeTournamentId);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [activeSection, setActiveSection] = useState<"create" | "run" | "live" | "results" | "history">("create");

  const [participants, setParticipants] = useState<string[]>([]);
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = isLoadingTournaments || (!!activeTournamentId && isLoadingDetails);
  const isAuthUnavailable = isGuest || !user?.id;
  // Note for non-coders: we treat "guest" and "not logged in yet" as the same for saving,
  // so we can gently guide users to sign in before they try to change tournament data.

  const ensureAuthenticated = (actionLabel: string) => {
    // Note for non-coders: this helper shows a friendly message instead of silently doing nothing
    // when someone isn't signed in yet.
    if (isAuthUnavailable) {
      toast.error(`Logga in för att ${actionLabel}.`);
      return false;
    }
    return true;
  };

  const showRetryToast = (message: string, onRetry: () => void) => {
    // Note for non-coders: this adds a "Try again" button directly in the error toast.
    toast.error(message, {
      action: {
        label: "Försök igen",
        onClick: onRetry,
      },
    });
  };

  const getActionErrorMessage = (error: unknown, fallback: string) => {
    // Note for non-coders: this helper makes sure auth-related errors get a clear, friendly message.
    return getAuthErrorMessage(error, fallback);
  };

  const [newTournament, setNewTournament] = useState({
    name: "",
    scheduled_at: toDateInput(new Date().toISOString()),
    location: "",
    score_target: SCORE_TARGET_DEFAULT,
    tournament_type: "americano",
  });

  const [recordingRound, setRecordingRound] = useState<any>(null);
  const [showPreviousGames, setShowPreviousGames] = useState(false);

  const activeTournament = useMemo(
    () => tournaments.find(t => t.id === activeTournamentId) || null,
    [tournaments, activeTournamentId]
  );

  const tournamentMode = activeTournament?.tournament_type || "americano";

  const nextRoundToPlay = useMemo(() => {
    if (tournamentMode !== 'americano') return null;
    return rounds.find(r => !Number.isFinite(r.team1_score) || !Number.isFinite(r.team2_score));
  }, [rounds, tournamentMode]);

  // Add Guest to selectable profiles
  const selectableProfiles = useMemo(() => {
    const hasGuest = profiles.some(p => p.id === GUEST_ID);
    if (hasGuest) return profiles;
    return [...profiles, { id: GUEST_ID, name: GUEST_NAME } as Profile];
  }, [profiles]);

  const profileMap = useMemo(() => makeProfileMap(selectableProfiles), [selectableProfiles]);

  const { standings } = useMemo(() => {
    return getTournamentState(rounds, participants);
  }, [rounds, participants]);

  const sortedStandings = useMemo(() => {
    return Object.values(standings).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      const diffA = a.pointsFor - a.pointsAgainst;
      const diffB = b.pointsFor - b.pointsAgainst;
      if (diffB !== diffA) return diffB - diffA;
      return b.wins - a.wins;
    });
  }, [standings]);

  const currentSuggestion = useMemo(() => {
    if (participants.length < 4) return null;
    return getNextSuggestion(rounds, participants, tournamentMode as any);
  }, [rounds, participants, tournamentMode]);


  useEffect(() => {
    if (tournamentData) {
      setParticipants(tournamentData.participants);
      setRounds(tournamentData.rounds);
    } else if (!activeTournamentId) {
      setParticipants([]);
      setRounds([]);
    }
  }, [tournamentData, activeTournamentId]);

  useEffect(() => {
    if (!activeTournament) {
      setActiveSection("create");
      return;
    }

    // Note for non-coders: we only auto-switch the tab when first selecting a tournament
    // or when the status changes (like from draft to in_progress), but NOT on every refresh.
    // This allows you to manually switch to "Live view" or "History" without being kicked back.
    const redirectKey = `${activeTournamentId}-${activeTournament.status}`;
    if (lastRedirectRef.current === redirectKey) return;

    if (activeTournament.status === "in_progress") {
      setActiveSection("run");
    } else if (activeTournament.status === "completed") {
      setActiveSection("results");
    } else {
      setActiveSection("create");
    }
    lastRedirectRef.current = redirectKey;
  }, [activeTournamentId, activeTournament?.status, activeTournament]);

  const createTournament = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const trimmedName = newTournament.name.trim();
    if (!trimmedName) {
      toast.error("Ange ett namn för turneringen.");
      return;
    }
    if (isGuest || !user?.id) {
      toast.error("Logga in för att skapa en turnering.");
      return;
    }
    setIsSaving(true);
    try {
      // Note for non-coders: robustly casting score_target to number to ensure database compatibility.
      const scoreTarget = Number(newTournament.score_target);
      const data = await tournamentService.createTournament({
        name: trimmedName,
        scheduled_at: newTournament.scheduled_at || null,
        location: newTournament.location?.trim() || null,
        score_target: isNaN(scoreTarget) ? SCORE_TARGET_DEFAULT : scoreTarget,
        tournament_type: newTournament.tournament_type,
        status: "draft",
        created_by: user.id,
      });
      invalidateTournamentData(queryClient, data.id);
      refetchTournamentDetails(queryClient, data.id);
      setActiveTournamentId(data.id);
      toast.success(`"${data.name}" har skapats.`);
    } catch (error: any) {
      console.error("Error creating tournament:", error);
      showRetryToast(
        getActionErrorMessage(error, "Kunde inte skapa turneringen. Kontrollera anslutningen."),
        () => void createTournament()
      );
    }
    setIsSaving(false);
  };

  const toggleParticipant = (profileId: string) => {
    if (isGuest || activeTournament?.status === "completed") return;
    setParticipants(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const saveRoster = async () => {
    if (!activeTournamentId) return;
    if (!ensureAuthenticated("spara roster")) return;
    if (participants.length < 4 || participants.length > 8) {
      toast.error("Välj 4 till 8 spelare.");
      return;
    }
    setIsSaving(true);
    try {
      const rosterIds = participants.map(profileId => profileId === GUEST_ID ? null : profileId);
      // Note for non-coders: we send the full list to the server so it can swap the roster
      // in one atomic step, instead of deleting first and hoping the insert succeeds.
      await tournamentService.replaceParticipants(activeTournamentId, rosterIds);
      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      toast.success("Roster sparad.");
      setIsSaving(false);
      return true;
    } catch (error: any) {
      showRetryToast(getActionErrorMessage(error, "Kunde inte spara roster."), () => void saveRoster());
      setIsSaving(false);
      return false;
    }
  };

  const hasValidRoundNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);
  // Note for non-coders: the database requires a round number for every saved round,
  // so this helper prevents us from sending empty or invalid values.

  const startTournament = async () => {
    if (!activeTournamentId) return;
    if (!ensureAuthenticated("starta turneringen")) return;

    // Auto-save roster before starting
    const saved = await saveRoster();
    if (!saved) return;

    setIsSaving(true);

    if (tournamentMode === 'americano') {
      const generatedRounds = generateAmericanoRounds(participants);
      const roundsPayload = generatedRounds.map(r => ({
        tournament_id: activeTournamentId,
        round_number: r.round_number,
        team1_ids: r.team1_ids.map(id => id === GUEST_ID ? null : id),
        team2_ids: r.team2_ids.map(id => id === GUEST_ID ? null : id),
        resting_ids: r.resting_ids.map(id => id === GUEST_ID ? null : id),
        mode: 'americano',
      }));

      const missingRoundNumber = roundsPayload.some(round => !hasValidRoundNumber(round.round_number));
      if (missingRoundNumber) {
        toast.error("Kan inte starta turneringen eftersom en rond saknar nummer.");
        setIsSaving(false);
        return;
      }

      try {
        await tournamentService.createRounds(roundsPayload);
      } catch (roundError: any) {
        toast.error(getActionErrorMessage(roundError, "Kunde inte skapa ronder."));
        setIsSaving(false);
        return;
      }
    }

    try {
      await tournamentService.updateTournament(activeTournamentId, { status: "in_progress" });
      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      setActiveSection("run");
      toast.success("Turneringen har startat.");
    } catch (error: any) {
      showRetryToast(getActionErrorMessage(error, "Kunde inte starta turneringen."), () => void startTournament());
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecordRound = () => {
    if (!currentSuggestion) return;
    setRecordingRound({
      ...currentSuggestion,
      team1_score: "",
      team2_score: "",
      mode: tournamentMode,
    });
  };

  const saveRound = async () => {
    if (!recordingRound) return;
    if (!ensureAuthenticated("spara ronden")) return;
    const s1 = Number(recordingRound.team1_score);
    const s2 = Number(recordingRound.team2_score);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      toast.error("Fyll i poäng för båda lagen.");
      return;
    }

    setIsSaving(true);
    const nextRoundNumber = rounds.length + 1;
    if (!hasValidRoundNumber(nextRoundNumber)) {
      toast.error("Kan inte spara rond utan ett giltigt nummer.");
      setIsSaving(false);
      return;
    }

    const activeIds = new Set([...recordingRound.team1_ids, ...recordingRound.team2_ids]);
    const restingIds = participants.filter(id => !activeIds.has(id));

    // Map GUEST_ID to null for database
    const t1Ids = recordingRound.team1_ids.map((id: string) => id === GUEST_ID ? null : id);
    const t2Ids = recordingRound.team2_ids.map((id: string) => id === GUEST_ID ? null : id);
    const rIds = restingIds.map(id => id === GUEST_ID ? null : id);

    try {
      await tournamentService.createRounds([{
        tournament_id: activeTournamentId,
        round_number: nextRoundNumber,
        team1_ids: t1Ids,
        team2_ids: t2Ids,
        resting_ids: rIds,
        team1_score: s1,
        team2_score: s2,
        mode: recordingRound.mode,
      }]);
      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      setRecordingRound(null);
      toast.success(`Rond ${nextRoundNumber} sparad.`);
    } catch (error: any) {
      showRetryToast(getActionErrorMessage(error, "Kunde inte spara rond."), () => void saveRound());
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTournament = async (tournament: any) => {
    if (!tournament?.id) return;
    if (!ensureAuthenticated("ta bort turneringen")) return;
    if (!window.confirm(`Ta bort turneringen "${tournament.name}"?`)) return;
    setIsSaving(true);

    try {
      // Explicitly delete matches first to handle FK constraint if migration hasn't run yet
      await matchService.deleteMatchesByTournamentId(tournament.id);
      // Note for non-coders: the service call uses a database function to clean up related data
      // in one safe transaction before removing the tournament itself.
      await tournamentService.deleteTournament(tournament.id);
      invalidateTournamentData(queryClient, tournament.id);
      refetchTournamentDetails(queryClient, tournament.id);
      if (activeTournamentId === tournament.id) setActiveTournamentId("");
      toast.success("Turneringen borttagen.");
    } catch (error: any) {
      showRetryToast(
        getActionErrorMessage(error, "Kunde inte ta bort turneringen."),
        () => void deleteTournament(tournament)
      );
    } finally {
      setIsSaving(false);
    }
  };

  const markAbandoned = async () => {
    if (!activeTournamentId) return;
    if (!ensureAuthenticated("avbryta turneringen")) return;
    if (!window.confirm("Markera turneringen som avbruten?")) return;
    setIsSaving(true);
    try {
      await tournamentService.updateTournament(activeTournamentId, { status: "abandoned" });
      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      toast.success("Turneringen avbruten.");
    } catch (error: any) {
      showRetryToast(getActionErrorMessage(error, "Kunde inte avbryta turneringen."), () => void markAbandoned());
    } finally {
      setIsSaving(false);
    }
  };

  const completeTournament = async () => {
    if (!activeTournament || isGuest) return;
    setIsSaving(true);

    const roundScorePayload = rounds
      .filter(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score))
      .map(round => ({
        id: round.id,
        team1_score: Number(round.team1_score),
        team2_score: Number(round.team2_score),
      }));
    // Note for non-coders: this saves the round scores in the database so the finished
    // tournament can show the same numbers later, even after refreshing the page.
    if (roundScorePayload.length) {
      const missingRoundIds = roundScorePayload.some(round => !round.id);
      if (missingRoundIds) {
        toast.error("Kan inte spara resultat eftersom en rond saknar ID.");
        setIsSaving(false);
        return;
      }

      try {
        await Promise.all(
          roundScorePayload.map(round =>
            tournamentService.updateRound(round.id, {
              team1_score: round.team1_score,
              team2_score: round.team2_score,
            })
          )
        );
      } catch (roundScoreError: any) {
        toast.error(getActionErrorMessage(roundScoreError, "Kunde inte spara ronder."));
        setIsSaving(false);
        return;
      }
    }

    // Sync to matches
    // Note for non-coders: we only sync rounds that actually have a score, to avoid
    // cluttering the match history with unplayed or empty games.
    const matchPayload = rounds
      .filter(round => Number.isFinite(round.team1_score) && Number.isFinite(round.team2_score))
      .map(round => ({
        team1: idsToNames(round.team1_ids, profileMap),
        team2: idsToNames(round.team2_ids, profileMap),
        team1_ids: round.team1_ids.map((id: string) => id === GUEST_ID ? null : id),
        team2_ids: round.team2_ids.map((id: string) => id === GUEST_ID ? null : id),
        team1_sets: Number(round.team1_score),
        team2_sets: Number(round.team2_score),
        score_type: "points",
        score_target: activeTournament.score_target,
        source_tournament_id: activeTournament.id,
        source_tournament_type: activeTournament.tournament_type || "mexicano",
        team1_serves_first: true,
        created_by: user.id,
      }));

    try {
      const matchSyncResult = await matchService.createMatch(matchPayload);
      if (matchSyncResult.status === "conflict") {
        toast.error(matchSyncResult.message);
        setIsSaving(false);
        return;
      }
      if (matchSyncResult.status === "pending") {
        toast.warning(matchSyncResult.message);
      }
    } catch (matchError: any) {
      showRetryToast(getActionErrorMessage(matchError, "Kunde inte synka matcher."), () => void completeTournament());
      setIsSaving(false);
      return;
    }

    const resultsPayload = sortedStandings.map((res, index) => ({
      tournament_id: activeTournament.id,
      profile_id: res.id === GUEST_ID ? null : res.id,
      rank: index + 1,
      points_for: res.pointsFor,
      points_against: res.pointsAgainst,
      matches_played: res.gamesPlayed,
      wins: res.wins,
      losses: res.losses,
    }));

    try {
      // Save results
      await tournamentService.createTournamentResults(resultsPayload);

      // Update tournament status
      await tournamentService.updateTournament(activeTournament.id, {
        status: "completed",
        completed_at: new Date().toISOString(),
        synced_to_matches: true
      });

      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      onTournamentSync?.();
      toast.success("Turneringen slutförd och synkad till historik.");
    } catch (error: any) {
      console.error("Error completing tournament:", error);
      showRetryToast(
        getActionErrorMessage(error, "Ett oväntat fel uppstod vid slutföring."),
        () => void completeTournament()
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChange = (team: "team1_score" | "team2_score", val: string) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;
    setRecordingRound((prev: any) => {
      const next = { ...prev, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    });
  };

  const updateRoundInDb = async (roundId: string, s1: any, s2: any) => {
    if (!ensureAuthenticated("spara resultat")) return;
    setIsSaving(true);
    try {
      await tournamentService.updateRound(roundId, {
        team1_score: Number(s1),
        team2_score: Number(s2),
      });
      invalidateTournamentData(queryClient, activeTournamentId);
      refetchTournamentDetails(queryClient, activeTournamentId);
      toast.success("Resultat sparat.");
    } catch (error: any) {
      showRetryToast(
        getActionErrorMessage(error, "Kunde inte spara resultat."),
        () => void updateRoundInDb(roundId, s1, s2)
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleScoreChangeInList = (roundId: string, team: "team1_score" | "team2_score", val: string) => {
    const score = val === "" ? "" : parseInt(val, 10);
    const target = activeTournament?.score_target || SCORE_TARGET_DEFAULT;

    setRounds(prev => prev.map(r => {
      if (r.id !== roundId) return r;
      const next = { ...r, [team]: score };
      if (typeof score === 'number' && score >= 0 && score <= target) {
        const otherTeam = team === 'team1_score' ? 'team2_score' : 'team1_score';
        next[otherTeam] = target - score;
      }
      return next;
    }));
  };

  const tournamentErrorMessage =
    (tournamentDetailsError as Error | undefined)?.message ||
    (tournamentListError as Error | undefined)?.message ||
    "Kunde inte hämta turneringsdata.";

  const canShareResults = Boolean(activeTournament && sortedStandings.length);
  const handleShareResults = () => {
    // Note for non-coders: we only open the share modal once results exist to avoid blank exports.
    if (!canShareResults) {
      toast.error("Det finns inga resultat att dela ännu.");
      return;
    }
    setShareOpen(true);
  };

  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Turnering</Typography>
        </Box>
        {activeTournament && (
          <Chip
            label={getTournamentStatusLabel(activeTournament.status)}
            color={
              activeTournament.status === 'completed' ? 'success' :
              activeTournament.status === 'in_progress' ? 'primary' :
              'default'
            }
            sx={{ fontWeight: 700 }}
          />
        )}
      </Box>

      {(isTournamentListError || isTournamentDetailsError) && (
        <AppAlert severity="error">
          {tournamentErrorMessage}
        </AppAlert>
      )}

      {isLoading ? (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3 }} />
            </Grid>
          </Grid>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
        </Stack>
      ) : (
        <>
          <Tabs
            value={activeSection}
            onChange={(_, value) => setActiveSection(value)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Turneringssektioner"
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '12px',
              px: 1,
              border: 1,
              borderColor: 'divider',
            }}
          >
            <Tab value="create" label="Skapa" />
            <Tab value="run" label="Spela" />
            <Tab value="live" label="Live view" />
            <Tab value="results" label="Resultat" />
            <Tab value="history" label="Historik" />
          </Tabs>

          {activeSection === "create" && (
            <TournamentConfig
              activeTournament={activeTournament}
              activeTournamentId={activeTournamentId}
              setActiveTournamentId={setActiveTournamentId}
              tournaments={tournaments}
              newTournament={newTournament}
              setNewTournament={setNewTournament}
              createTournament={createTournament}
              participants={participants}
              selectableProfiles={selectableProfiles}
              toggleParticipant={toggleParticipant}
              saveRoster={saveRoster}
              startTournament={startTournament}
              isSaving={isSaving}
              isGuest={isGuest}
              isAuthUnavailable={isAuthUnavailable}
            />
          )}
          {activeSection === "run" && (
            <ActiveRound
              activeTournament={activeTournament}
              tournamentMode={tournamentMode}
              rounds={rounds}
              recordingRound={recordingRound}
              setRecordingRound={setRecordingRound}
              currentSuggestion={currentSuggestion}
              handleRecordRound={handleRecordRound}
              handleScoreChange={handleScoreChange}
              saveRound={saveRound}
              updateRoundInDb={updateRoundInDb}
              handleScoreChangeInList={handleScoreChangeInList}
              nextRoundToPlay={nextRoundToPlay}
              showPreviousGames={showPreviousGames}
              setShowPreviousGames={setShowPreviousGames}
              sortedStandings={sortedStandings}
              markAbandoned={markAbandoned}
              completeTournament={completeTournament}
              isSaving={isSaving}
              isAuthUnavailable={isAuthUnavailable}
              profileMap={profileMap}
              isMobile={isMobile}
            />
          )}
          {activeSection === "live" && (
            <LiveStandings
              activeTournament={activeTournament}
              rounds={rounds}
              sortedStandings={sortedStandings}
              profileMap={profileMap}
              participants={participants}
            />
          )}
          {activeSection === "results" && (
            <TournamentResults
              activeTournament={activeTournament}
              sortedStandings={sortedStandings}
              rounds={rounds}
              profileMap={profileMap}
              onShare={handleShareResults}
              onBack={() => setActiveTournamentId("")}
              canShareResults={canShareResults}
              isMobile={isMobile}
            />
          )}
          {activeSection === "history" && (
            <TournamentHistory
              tournaments={tournaments}
              onSelect={setActiveTournamentId}
              onDelete={deleteTournament}
              isMobile={isMobile}
              isAuthUnavailable={isAuthUnavailable}
            />
          )}
        </>
      )}

      {activeTournament && (
        <TheShareable
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          type="tournament"
          data={{
            tournament: activeTournament,
            results: sortedStandings,
            profileMap: Object.fromEntries(
              selectableProfiles.map(p => [p.id, getProfileDisplayName(p)])
            )
          }}
        />
      )}
    </Box>
  );
}
