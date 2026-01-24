import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster } from "sonner";
import { Skeleton } from "@mui/material";
import PullToRefresh from "react-simple-pull-to-refresh";
import { supabase } from "./supabaseClient";

import Auth from "./Components/Auth";
import MatchForm from "./Components/MatchForm";
import EloLeaderboard from "./Components/EloLeaderboard";
import History from "./Components/History";
import PlayerSection, { HeadToHeadSection } from "./Components/PlayerSection";
import ProfileSetup from "./Components/ProfileSetup";
import AdminPanel from "./Components/AdminPanel";
import MVP from "./Components/MVP";
import Heatmap from "./Components/Heatmap";
import FilterBar from "./Components/FilterBar";
import MexicanaTournament from "./Components/MexicanaTournament";
import MeritsSection from "./Components/MeritsSection";

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
  const [tournamentResults, setTournamentResults] = useState([]);
  const [matchFilter, setMatchFilter] = useState("all");
  const [dataError, setDataError] = useState("");
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [matchCursor, setMatchCursor] = useState(null);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [pendingScrollId, setPendingScrollId] = useState(null);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const menuRef = useRef(null);

  const MATCH_PAGE_SIZE = 1000;

  // 1) Auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) {
      console.error(error);
      setDataError("Kunde inte hämta spelare. Försök igen senare.");
    }
    const loadedProfiles = data || [];
    setAllProfiles(loadedProfiles);
    setProfiles(
      loadedProfiles.filter(
        profile => !profile.is_deleted && (profile.is_approved || profile.is_admin)
      )
    );
    setIsLoadingProfiles(false);
  }, []);

  const loadTournamentResults = useCallback(async () => {
    const { data, error } = await supabase
      .from("mexicana_results")
      .select("*, mexicana_tournaments(tournament_type)");
    if (error) {
      console.error(error);
      return;
    }
    // Flatten the joined data
    const flattened = (data || []).map(row => ({
      ...row,
      tournament_type: row.mexicana_tournaments?.tournament_type || 'mexicano'
    }));
    setTournamentResults(flattened);
  }, []);

  const applyMatchFilter = (query, filter) => {
    if (filter === "short") {
      return query.lte("team1_sets", 3).lte("team2_sets", 3);
    }
    if (filter === "long") {
      return query.or("team1_sets.gte.6,team2_sets.gte.6");
    }
    if (filter === "tournaments") {
      return query.not("source_tournament_id", "is", null);
    }
    return query;
  };

  const matchPassesFilter = (match, filter) => {
    if (filter === "tournaments") {
      return match.source_tournament_id !== null;
    }
    if ((match?.score_type || "sets") === "points" && filter !== "all") {
      return false;
    }
    const team1Sets = Number(match.team1_sets ?? 0);
    const team2Sets = Number(match.team2_sets ?? 0);
    if (filter === "short") {
      return team1Sets <= 3 && team2Sets <= 3;
    }
    if (filter === "long") {
      return team1Sets >= 6 || team2Sets >= 6;
    }
    return true;
  };

  const loadMatchesPage = useCallback(async ({
    replace = false,
    cursor = null,
    filter = matchFilter,
  } = {}) => {
    setIsLoadingMatches(true);
    let allMatches = [];
    let currentCursor = cursor;
    let hasMore = true;

    try {
      while (hasMore) {
        let query = supabase
          .from("matches")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(MATCH_PAGE_SIZE);

        if (currentCursor) {
          query = query.lt("created_at", currentCursor);
        }

        query = applyMatchFilter(query, filter);
        const { data, error } = await query;

        if (error) {
          console.error(error);
          setDataError("Kunde inte hämta matcher. Försök igen senare.");
          setIsLoadingMatches(false);
          return;
        }

        const pageMatches = data || [];
        allMatches = [...allMatches, ...pageMatches];

        // Only fetch multiple pages if we are replacing (initial load for a filter)
        if (!replace || pageMatches.length < MATCH_PAGE_SIZE) {
          hasMore = false;
          setHasMoreMatches(pageMatches.length === MATCH_PAGE_SIZE);
        } else {
          currentCursor = pageMatches[pageMatches.length - 1].created_at;
        }
      }

      setMatches(prev => {
        if (replace) return allMatches;
        const seen = new Set(prev.map(match => match.id));
        const merged = [...prev];
        allMatches.forEach(match => {
          if (!seen.has(match.id)) merged.push(match);
        });
        return merged;
      });

      setMatchCursor(allMatches.length ? allMatches[allMatches.length - 1].created_at : null);
    } catch (err) {
      console.error(err);
      setDataError("Ett oväntat fel uppstod vid hämtning av matcher.");
    } finally {
      setIsLoadingMatches(false);
    }
  }, [MATCH_PAGE_SIZE, matchFilter]);

  // 2) Load profiles + matches + realtime
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  useEffect(() => {
    loadTournamentResults();
  }, [loadTournamentResults]);

  useEffect(() => {
    loadMatchesPage({ replace: true, cursor: null, filter: matchFilter });
  }, [matchFilter, loadMatchesPage]);

  useEffect(() => {
    const channel = supabase
      .channel("matches-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        payload => {
          setMatches(prev => {
            if (payload.eventType === "INSERT") {
              if (!matchPassesFilter(payload.new, matchFilter)) return prev;
              return [payload.new, ...prev];
            }
            if (payload.eventType === "DELETE")
              return prev.filter(m => m.id !== payload.old.id);
            if (payload.eventType === "UPDATE") {
              if (!matchPassesFilter(payload.new, matchFilter)) {
                return prev.filter(m => m.id !== payload.new.id);
              }
              return prev.map(m => (m.id === payload.new.id ? payload.new : m));
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchFilter]);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  const parseHash = useCallback((hashValue) => {
    const hash = hashValue.replace(/^#/, "");
    if (!hash || hash === "dashboard") {
      return { page: "dashboard", scrollId: null };
    }
    if (hash === "history") {
      return { page: "history", scrollId: null };
    }
    if (hash === "single-game") {
      return { page: "single-game", scrollId: null };
    }
    if (hash === "mexicana" || hash === "tournament") {
      return { page: "mexicana", scrollId: null };
    }
    if (hash === "meriter") {
      return { page: "dashboard", scrollId: "meriter" };
    }
    if (hash === "admin") {
      return { page: "admin", scrollId: null };
    }
    if (["profile", "head-to-head"].includes(hash)) {
      return { page: "dashboard", scrollId: hash };
    }
    return { page: "dashboard", scrollId: null };
  }, []);

  const navigateTo = useCallback((page, scrollId = null) => {
    setActivePage(page);
    setPendingScrollId(scrollId);
    if (page === "dashboard") {
      window.location.hash = scrollId ? `#${scrollId}` : "#dashboard";
    } else {
      window.location.hash = `#${page}`;
    }
    closeMenu();
  }, [closeMenu]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const focusable = menuRef.current?.querySelector("a, button");
    focusable?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, closeMenu]);

  useEffect(() => {
    const handleHashChange = () => {
      const { page, scrollId } = parseHash(window.location.hash);
      setActivePage(page);
      if (scrollId) {
        setPendingScrollId(scrollId);
      }
    };
    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [parseHash]);

  useEffect(() => {
    if (!pendingScrollId) return;
    requestAnimationFrame(() => {
      document.getElementById(pendingScrollId)?.scrollIntoView({ behavior: "smooth" });
      setPendingScrollId(null);
    });
  }, [pendingScrollId, activePage]);

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

  useEffect(() => {
    if (activePage === "admin" && !userWithAdmin?.is_admin) {
      setActivePage("dashboard");
      window.location.hash = "#dashboard";
    }
  }, [activePage, userWithAdmin]);

  const handleAuthAction = () => {
    closeMenu();
    if (isGuest) {
      setIsGuest(false);
    } else {
      supabase.auth.signOut();
    }
  };

  const loadMoreMatches = async () => {
    if (isLoadingMatches || !hasMoreMatches || !matchCursor) return;
    await loadMatchesPage({ cursor: matchCursor, filter: matchFilter });
  };

  const retryData = useCallback(() => {
    setDataError("");
    loadProfiles();
    loadMatchesPage({ replace: true, cursor: null, filter: matchFilter });
    loadTournamentResults();
  }, [loadProfiles, loadMatchesPage, matchFilter, loadTournamentResults]);

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

  return (
    <div className="container">
      <Toaster position="top-center" richColors />
      {dataError && (
        <div className="notice-banner error" role="alert">
          <div>
            <strong>Fel:</strong> {dataError}
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={retryData}
            disabled={isLoadingProfiles || isLoadingMatches}
          >
            Försök igen
          </button>
        </div>
      )}
      <div className="app-header">
        <h1 className="app-title">
          <span className="app-logo" aria-hidden="true">GS</span>
          <span className="app-title-text">
            <span className="app-title-name">Grabbarnas serie</span>
            <span className="app-title-subtitle">Padel, prestige & bragging rights</span>
          </span>
        </h1>
        <button
          ref={menuButtonRef}
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

      <nav
        id="app-menu"
        ref={menuRef}
        className={`app-menu ${isMenuOpen ? "open" : ""}`}
        aria-label="Huvudmeny"
      >
        <a
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("dashboard");
          }}
        >
          Hemskärm
        </a>
        {!isGuest && (
          <a
            href="#profile"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("dashboard", "profile");
            }}
          >
            Spelprofil
          </a>
        )}
        {!isGuest && (
          <a
            href="#head-to-head"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("dashboard", "head-to-head");
            }}
          >
            Head-to-head
          </a>
        )}
        {!isGuest && (
          <a
            href="#meriter"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("dashboard", "meriter");
            }}
          >
            Meriter
          </a>
        )}
        <a
          href="#history"
          onClick={(event) => {
            event.preventDefault();
            navigateTo("history");
          }}
        >
          Match-historik
        </a>
        {userWithAdmin?.is_admin && (
          <a
            href="#admin"
            onClick={(event) => {
              event.preventDefault();
              navigateTo("admin");
            }}
          >
            Admin
          </a>
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

      {activePage === "dashboard" && (
        <PullToRefresh onRefresh={retryData}>
        <section id="dashboard" className="page-section">
          {(isLoadingProfiles || isLoadingMatches) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
              <Skeleton variant="rectangular" height={40} sx={{ borderRadius: '999px' }} />
              <div className="mvp-grid">
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '14px' }} />
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: '14px' }} />
              </div>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '14px' }} />
            </div>
          ) : (
            <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          )}
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

          {!isGuest && (
            <section id="profile" className="page-section">
              <PlayerSection
                key={userWithAdmin?.id}
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
                onProfileUpdate={handleProfileUpdate}
              />
            </section>
          )}

          {!isGuest && (
            <section id="head-to-head" className="page-section">
              <HeadToHeadSection
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
              />
            </section>
          )}

          {!isGuest && (
            <section id="meriter" className="page-section">
              <MeritsSection
                user={userWithAdmin}
                profiles={profiles}
                matches={filteredMatches}
                tournamentResults={tournamentResults}
                onProfileUpdate={handleProfileUpdate}
              />
            </section>
          )}
        </section>
        </PullToRefresh>
      )}

      {activePage === "single-game" && !isGuest && (
        <section id="single-game" className="page-section">
          <h2>Enkel match</h2>
          <MatchForm
            user={user}
            profiles={profiles}
            matches={matches}
            eloPlayers={allEloPlayers}
          />
        </section>
      )}

      {activePage === "history" && (
        <section id="history" className="page-section">
          <h2>Match-historik</h2>
          <FilterBar filter={matchFilter} setFilter={setMatchFilter} />
          {isLoadingMatches && matches.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: '14px' }} />
            </div>
          ) : (
            <>
              <History
                matches={filteredMatches}
                profiles={historyProfiles}
                user={isGuest ? null : userWithAdmin}
                onRefresh={retryData}
              />
              {hasMoreMatches && (
                <div className="load-more">
                  <button type="button" onClick={loadMoreMatches} disabled={isLoadingMatches}>
                    {isLoadingMatches ? <Skeleton width={100} height={24} sx={{ display: 'inline-block' }} /> : "Visa fler matcher"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activePage === "mexicana" && (
        <section id="mexicana" className="page-section">
          <MexicanaTournament
            user={isGuest ? null : userWithAdmin}
            profiles={profiles}
            eloPlayers={allEloPlayers}
            isGuest={isGuest}
            onTournamentSync={loadTournamentResults}
            onRefresh={retryData}
          />
        </section>
      )}

      {activePage === "admin" && userWithAdmin?.is_admin && (
        <section id="admin" className="page-section">
          <AdminPanel
            user={userWithAdmin}
            profiles={allProfiles}
            onProfileUpdate={handleProfileUpdate}
            onProfileDelete={handleProfileDelete}
          />
        </section>
      )}

      <>
        {isFabOpen && (
          <div className="fab-overlay" onClick={() => setIsFabOpen(false)}>
            <div className="fab-options">
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => { navigateTo("single-game"); setIsFabOpen(false); }}
                >
                  🎾 Enkel match
                </button>
              )}
              <button
                type="button"
                onClick={() => { navigateTo("mexicana"); setIsFabOpen(false); }}
              >
                🏆 Turnering
              </button>
            </div>
          </div>
        )}
        <button
          type="button"
          className={`fab ${isFabOpen ? 'open' : ''}`}
          onClick={() => setIsFabOpen(!isFabOpen)}
          aria-label="Spela"
        >
          {isFabOpen ? '✕' : '+'}
        </button>
      </>
    </div>
  );
}
