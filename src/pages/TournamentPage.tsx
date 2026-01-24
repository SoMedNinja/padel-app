import React from "react";
import MexicanaTournament from "../Components/MexicanaTournament";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useMatches } from "../hooks/useMatches";
import { calculateElo } from "../utils/elo";
import { useQueryClient } from "@tanstack/react-query";
import { Match, Profile } from "../types";

export default function TournamentPage() {
  const { user, isGuest } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const { data: matches = [] as Match[] } = useMatches("all");
  const queryClient = useQueryClient();

  const allEloPlayers = calculateElo(matches, profiles);

  const handleTournamentSync = () => {
    queryClient.invalidateQueries({ queryKey: ["tournamentResults"] });
  };

  return (
    <section id="mexicana" className="page-section">
      <MexicanaTournament
        user={isGuest ? null : user}
        profiles={profiles}
        eloPlayers={allEloPlayers}
        isGuest={isGuest}
        onTournamentSync={handleTournamentSync}
      />
    </section>
  );
}
