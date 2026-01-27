import React from "react";
import MatchForm from "../Components/MatchForm";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useMatches } from "../hooks/useMatches";
import { calculateElo } from "../utils/elo";
import { Match, Profile } from "../types";

export default function SingleGamePage() {
  const { user, isGuest } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const { data: matches = [] as Match[] } = useMatches({ type: "all" });

  const allEloPlayers = calculateElo(matches, profiles);

  if (isGuest) return <div>Endast inloggade användare kan lägga till matcher.</div>;

  return (
    <div id="single-game">
      <MatchForm
        user={user}
        profiles={profiles}
        matches={matches}
        eloPlayers={allEloPlayers}
      />
    </div>
  );
}
