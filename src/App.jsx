import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

import Auth from "./Components/Auth";
import MatchForm from "./Components/MatchForm";
import EloLeaderboard from "./Components/EloLeaderboard";
import History from "./Components/History";

import { calculateElo } from "./utils/elo";

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // innehåller is_admin
  const [profiles, setProfiles] = useState([]);
  const [matches, setMatches] = useState([]);

  // 1) Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // 2) Load profiles + matches + realtime
  useEffect(() => {
    // Profiles (alla)
    supabase.from("profiles").select("*").then(({ data, error }) => {
      if (error) console.error(error);
      setProfiles(data || []);
    });

    // Matches
    supabase
      .from("matches")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error(error);
        setMatches(data || []);
      });

    // Realtime matches
    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        payload => {
          setMatches(prev => {
            if (payload.eventType === "INSERT") return [payload.new, ...prev];
            if (payload.eventType === "DELETE")
              return prev.filter(m => m.id !== payload.old.id);
            if (payload.eventType === "UPDATE")
              return prev.map(m => (m.id === payload.new.id ? payload.new : m));
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 3) Load my profile (is_admin)
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setProfile(data || null));
  }, [user]);

  const userWithAdmin = useMemo(() => {
    if (!user) return null;
    return { ...user, is_admin: profile?.is_admin === true };
  }, [user, profile]);

  if (!user) return <Auth onAuth={() => supabase.auth.getUser().then(({ data }) => setUser(data.user))} />;

  const eloPlayers = calculateElo(matches, profiles);

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>🎾 Padel Tracker</h1>
        <button onClick={() => supabase.auth.signOut()}>Logga ut</button>
      </div>

      <MatchForm user={user} />

      <EloLeaderboard players={eloPlayers} />

      <History matches={matches} profiles={profiles} user={userWithAdmin} />
    </div>
  );
}
