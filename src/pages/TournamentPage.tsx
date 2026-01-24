import React from "react";
import MexicanaTournament from "../Components/MexicanaTournament";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useMatches } from "../hooks/useMatches";
import { calculateElo } from "../utils/elo";
import { useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Match, Profile } from "../types";

export default function TournamentPage() {
  const { user, isGuest } = useStore();
  const { data: profiles = [] as Profile[], refetch: refetchProfiles } = useProfiles();
  const { data: matches = [] as Match[], refetch: refetchMatches } = useMatches("all");
  const queryClient = useQueryClient();

  const allEloPlayers = calculateElo(matches, profiles);

  const handleTournamentSync = () => {
    queryClient.invalidateQueries({ queryKey: ["tournamentResults"] });
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchProfiles(),
      refetchMatches(),
      queryClient.invalidateQueries({ queryKey: ["tournaments"] }),
      queryClient.invalidateQueries({ queryKey: ["tournamentDetails"] }),
      queryClient.invalidateQueries({ queryKey: ["tournamentResults"] }),
    ]);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <section id="mexicana" className="page-section">
      <MexicanaTournament
        user={isGuest ? null : user}
        profiles={profiles}
        eloPlayers={allEloPlayers}
        isGuest={isGuest}
        onTournamentSync={handleTournamentSync}
      />
    </section>
    </PullToRefresh>
  );
}
