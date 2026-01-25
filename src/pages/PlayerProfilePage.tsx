import React from "react";
import PlayerSection, { HeadToHeadSection } from "../Components/PlayerSection";
import MeritsSection from "../Components/MeritsSection";
import FilterBar from "../Components/FilterBar";
import { useStore } from "../store/useStore";
import { useMatches } from "../hooks/useMatches";
import { useProfiles } from "../hooks/useProfiles";
import { usePadelData } from "../hooks/usePadelData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabaseClient";
import { Match, Profile, TournamentResult } from "../types";
import { useScrollToFragment } from "../hooks/useScrollToFragment";

export default function PlayerProfilePage() {
  const { matchFilter, setMatchFilter, user, isGuest } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const { data: matches = [] as Match[] } = useMatches(matchFilter);

  useScrollToFragment();

  const { data: tournamentResults = [] as TournamentResult[] } = useQuery({
    queryKey: ["tournamentResults"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("mexicana_results")
        .select("*, mexicana_tournaments(tournament_type)") as any);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        tournament_type: row.mexicana_tournaments?.tournament_type || 'mexicano'
      })) as TournamentResult[];
    }
  });

  const { filteredMatches } = usePadelData(matches, matchFilter, profiles);

  // Simplified handling for admin and approval state for now
  const userWithAdmin = user ? { ...user, is_admin: user.is_admin } : null;

  const handleProfileUpdate = () => {
    // In a real refactor, TanStack Query would handle invalidation
  };

  if (isGuest) {
    return (
      <div className="container">
        <section className="player-section">
          <h2>Spelarprofil</h2>
          <p className="muted">Logga in för att se din spelprofil, meriter och statistik.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-section">
      {/* The filter bar lets you narrow which matches the profile sections use below. */}
      <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
      <section id="profile" className="page-section">
        <PlayerSection
          user={userWithAdmin}
          profiles={profiles}
          matches={filteredMatches}
          tournamentResults={tournamentResults}
          onProfileUpdate={handleProfileUpdate}
        />
      </section>

      <section id="head-to-head" className="page-section">
        <HeadToHeadSection
          user={userWithAdmin}
          profiles={profiles}
          matches={filteredMatches}
          tournamentResults={tournamentResults}
        />
      </section>

      <section id="meriter" className="page-section">
        <MeritsSection
          user={userWithAdmin}
          profiles={profiles}
          matches={filteredMatches}
          tournamentResults={tournamentResults}
          onProfileUpdate={handleProfileUpdate}
        />
      </section>
    </div>
  );
}
