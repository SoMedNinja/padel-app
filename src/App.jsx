import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

import Auth from "./Components/Auth";
import MatchForm from "./Components/MatchForm";
import EloLeaderboard from "./Components/EloLeaderboard";
import History from "./Components/History";
import PlayerSection from "./Components/PlayerSection";
import ProfileSetup from "./Components/ProfileSetup";
import AdminPanel from "./Components/AdminPanel";
import MVP from "./Components/MVP";
import Heatmap from "./Components/Heatmap";
import FilterBar from "./Components/FilterBar";

import { calculateElo } from "./utils/elo";
import { usePadelData } from "./hooks/usePadelData";

export default function App() {
  const [user, setUser] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null); // innehåller is_admin
  const [profileUserId, setProfileUserId] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchFilter, setMatchFilter] = useState("all");

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
      const loadedProfiles = data || [];
      setAllProfiles(loadedProfiles);
      setProfiles(
        loadedProfiles.filter(
          profile => !profile.is_deleted && (profile.is_approved || profile.is_admin)
        )
      );
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
    if (!user?.id) return;

    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data || null);
        setProfileUserId(user.id);
      });
  }, [user]);

  const { filteredMatches, playersWithTrend: rawPlayersWithTrend } = usePadelData(
    matches,
    matchFilter,
    profiles
  );
  const deletedProfileIds = useMemo(() => {
    return new Set(allProfiles.filter(profile => profile.is_deleted).map(profile => profile.id));
  }, [allProfiles]);
  const playersWithTrend = useMemo(() => {
    if (!deletedProfileIds.size) return rawPlayersWithTrend;
    return rawPlayersWithTrend.filter(player => !deletedProfileIds.has(player.id));
  }, [rawPlayersWithTrend, deletedProfileIds]);
  const allEloPlayers = useMemo(() => {
    const players = calculateElo(matches, profiles);
    if (!deletedProfileIds.size) return players;
    return players.filter(player => !deletedProfileIds.has(player.id));
  }, [matches, profiles, deletedProfileIds]);
  const historyProfiles = useMemo(() => {
    const deletedProfiles = allProfiles.filter(profile => profile.is_deleted);
    if (!deletedProfiles.length) return profiles;
    const seen = new Set();
    return [...profiles, ...deletedProfiles].filter(profile => {
      if (seen.has(profile.id)) return false;
      seen.add(profile.id);
      return true;
    });
  }, [allProfiles, profiles]);

  const activeProfile = useMemo(() => {
    if (!user?.id || profileUserId !== user.id) return null;
    return profile;
  }, [profile, profileUserId, user]);

  const userWithAdmin = useMemo(() => {
    if (!user) return null;
    return { ...user, is_admin: activeProfile?.is_admin === true };
  }, [user, activeProfile]);

  const closeMenu = () => setIsMenuOpen(false);
  const handleAuthAction = () => {
    closeMenu();
    if (isGuest) {
      setIsGuest(false);
    } else {
      supabase.auth.signOut();
    }
  };

  if (!user && !isGuest) {
    return (
      <Auth
        onAuth={() => {
          setIsGuest(false);
          return supabase.auth.getUser().then(({ data }) => setUser(data.user));
        }}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  if (!isGuest && user?.id && profileUserId === user.id && !activeProfile?.name) {
    return (
      <div className="container">
        <ProfileSetup
          user={user}
          initialName={activeProfile?.name}
          onComplete={(updatedProfile) => {
            if (updatedProfile) {
              handleProfileUpdate(updatedProfile);
            }
            setProfileUserId(user.id);
          }}
        />
      </div>
    );
  }

  if (
    !isGuest &&
    user?.id &&
    profileUserId === user.id &&
    activeProfile &&
    activeProfile?.is_admin !== true &&
    activeProfile?.is_approved !== true
  ) {
    return (
      <div className="container">
        <section className="player-section approval-gate">
          <h2>Väntar på godkännande</h2>
          <p className="muted">
            En administratör behöver godkänna din åtkomst innan du kan använda
            appen fullt ut.
          </p>
          <button type="button" onClick={handleAuthAction}>
            Logga ut
          </button>
        </section>
      </div>
    );
  }

  const handleProfileUpdate = (updatedProfile) => {
    setAllProfiles(prev => {
      const exists = prev.some(profile => profile.id === updatedProfile.id);
      if (exists) {
        return prev.map(profile =>
          profile.id === updatedProfile.id ? { ...profile, ...updatedProfile } : profile
        );
      }
      return [...prev, updatedProfile];
    });
    const shouldInclude =
      !updatedProfile.is_deleted && (updatedProfile.is_approved || updatedProfile.is_admin);
    setProfiles(prev => {
      const exists = prev.some(profile => profile.id === updatedProfile.id);
      if (shouldInclude) {
        if (exists) {
          return prev.map(profile =>
            profile.id === updatedProfile.id ? { ...profile, ...updatedProfile } : profile
          );
        }
        return [...prev, updatedProfile];
      }
      return prev.filter(profile => profile.id !== updatedProfile.id);
    });
    const currentUserId = profileUserId ?? user?.id;
    if (updatedProfile.id === currentUserId) {
      setProfile(prev => ({ ...(prev || {}), ...updatedProfile }));
    }
  };

  const handleProfileDelete = (deletedProfile) => {
    if (!deletedProfile) return;
    setAllProfiles(prev => {
      const exists = prev.some(profile => profile.id === deletedProfile.id);
      if (exists) {
        return prev.map(profile =>
          profile.id === deletedProfile.id ? { ...profile, ...deletedProfile } : profile
        );
      }
      return [...prev, deletedProfile];
    });
    setProfiles(prev => prev.filter(profile => profile.id !== deletedProfile.id));
    if (deletedProfile.id === profileUserId) {
      setProfile(null);
    }
  };

  return (
    <div className="container">
      <div className="app-header">
        <h1 className="app-title">🎾 Padel Tracker</h1>
        <button
          className="menu-toggle"
          type="button"
          aria-label="Öppna meny"
          aria-expanded={isMenuOpen}
          aria-controls="app-menu"
          onClick={() => setIsMenuOpen(open => !open)}
        >
          ☰
        </button>
      </div>

      {isMenuOpen && <div className="app-menu-backdrop" onClick={closeMenu} />}

      <nav id="app-menu" className={`app-menu ${isMenuOpen ? "open" : ""}`}>
        <a href="#dashboard" onClick={closeMenu}>Hemskärm</a>
        {!isGuest && (
          <a href="#profile" onClick={closeMenu}>Spelprofil</a>
        )}
        <a href="#history" onClick={closeMenu}>Match-historik</a>
        {userWithAdmin?.is_admin && (
          <a href="#admin" onClick={closeMenu}>Admin</a>
        )}
        <button type="button" className="ghost-button" onClick={handleAuthAction}>
          {isGuest ? "Logga in / skapa konto" : "Logga ut"}
        </button>
      </nav>

      {isGuest && (
        <div className="guest-banner">
          <div className="guest-banner-header">
            <strong>Gästläge</strong>
            <span className="muted">Utforska statistik, men inga ändringar sparas.</span>
          </div>
          <div className="guest-banner-content">
            <div>
              <span className="guest-banner-label">Du kan se</span>
              <ul>
                <li>Leaderboard, MVP och heatmap</li>
                <li>Match-historik</li>
              </ul>
            </div>
            <div>
              <span className="guest-banner-label">Kräver inloggning</span>
              <ul>
                <li>Lägga till eller redigera matcher</li>
                <li>Uppdatera spelprofil och avatar</li>
                <li>Admin- och godkännandevy</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <section id="dashboard" className="page-section">
        {!isGuest && (
          <MatchForm
            user={user}
            profiles={profiles}
            matches={matches}
            eloPlayers={allEloPlayers}
          />
        )}
        <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
        <div className="mvp-grid">
          <MVP
            matches={filteredMatches}
            players={playersWithTrend}
            mode="evening"
            title="Kvällens MVP"
          />
          <MVP
            matches={filteredMatches}
            players={playersWithTrend}
            mode="30days"
            title="Månadens MVP"
          />
        </div>
        <EloLeaderboard players={playersWithTrend} />
        <Heatmap matches={filteredMatches} profiles={profiles} eloPlayers={playersWithTrend} />
      </section>

      {!isGuest && (
        <section id="profile" className="page-section">
          <PlayerSection
            key={userWithAdmin?.id}
            user={userWithAdmin}
            profiles={profiles}
            matches={filteredMatches}
            onProfileUpdate={handleProfileUpdate}
          />
        </section>
      )}

      <section id="history" className="page-section">
        <History
          matches={filteredMatches}
          profiles={historyProfiles}
          user={isGuest ? null : userWithAdmin}
        />
      </section>

      {userWithAdmin?.is_admin && (
        <section id="admin" className="page-section">
          <AdminPanel
            user={userWithAdmin}
            profiles={allProfiles}
            onProfileUpdate={handleProfileUpdate}
            onProfileDelete={handleProfileDelete}
          />
        </section>
      )}
    </div>
  );
}
