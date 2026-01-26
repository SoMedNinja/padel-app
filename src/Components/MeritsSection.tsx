import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildPlayerBadgeStats,
  buildPlayerBadges,
} from "../utils/badges";
import { makeNameToIdMap } from "../utils/profileMap";
import { supabase } from "../supabaseClient";

const groupBadgesByType = (badges = []) => {
  const grouped = new Map();
  badges.forEach((badge) => {
    const group = badge.group || "Övrigt";
    if (!grouped.has(group)) {
      grouped.set(group, { label: group, order: badge.groupOrder ?? 999, items: [] });
    }
    grouped.get(group).items.push(badge);
  });

  return [...grouped.values()].sort((a, b) => a.order - b.order);
};

export default function MeritsSection({
  user,
  profiles = [],
  matches = [],
  tournamentResults = [],
  onProfileUpdate,
}) {
  const playerProfile = useMemo(
    () => profiles.find(profile => profile.id === user?.id),
    [profiles, user]
  );
  const nameToIdMap = useMemo(() => makeNameToIdMap(profiles), [profiles]);

  const [isEarnedExpanded, setIsEarnedExpanded] = useState(true);
  const [isLockedExpanded, setIsLockedExpanded] = useState(true);
  const [selectedBadgeId, setSelectedBadgeId] = useState(
    playerProfile?.featured_badge_id || null
  );
  const [savingBadgeId, setSavingBadgeId] = useState(null);

  const handleBadgeSelection = async (badgeId) => {
    if (!user?.id) return;
    const nextBadgeId = badgeId === selectedBadgeId ? null : badgeId;
    setSavingBadgeId(badgeId);
    setSelectedBadgeId(nextBadgeId);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ featured_badge_id: nextBadgeId })
        .eq("id", user.id)
        .select();

      if (error) {
        toast.error(error.message || "Kunde inte uppdatera visad merit.");
        setSelectedBadgeId(playerProfile?.featured_badge_id || null);
      } else if (data?.length) {
        onProfileUpdate?.(data[0]);
      }
    } catch (error) {
      toast.error(error?.message || "Kunde inte uppdatera visad merit.");
      setSelectedBadgeId(playerProfile?.featured_badge_id || null);
    } finally {
      setSavingBadgeId(null);
    }
  };

  const allPlayerStats = useMemo(() => {
    const statsMap: Record<string, any> = {};
    profiles.forEach(profile => {
      statsMap[profile.id] = buildPlayerBadgeStats(matches, profiles, profile.id, nameToIdMap, tournamentResults);
    });
    return statsMap;
  }, [matches, profiles, nameToIdMap, tournamentResults]);

  const badgeStats = useMemo(
    () => allPlayerStats[user?.id || ''],
    [allPlayerStats, user]
  );

  const badgeSummary = useMemo(
    () => buildPlayerBadges(badgeStats, allPlayerStats, user?.id),
    [badgeStats, allPlayerStats, user]
  );
  const earnedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.earnedBadges),
    [badgeSummary.earnedBadges]
  );
  const lockedBadgeGroups = useMemo(
    () => groupBadgesByType(badgeSummary.lockedBadges),
    [badgeSummary.lockedBadges]
  );

  return (
    <div className="badges-section table-card" style={{ marginTop: '2rem' }}>
      <div className="badges-header">
        <div>
          <h3>Meriter</h3>
          <p className="muted">
            {badgeSummary.totalEarned} av {badgeSummary.totalBadges} meriter upplåsta
          </p>
        </div>
      </div>

      <div className="badge-group">
        <div className="badge-group-header">
          <div className="badge-group-title">Upplåsta</div>
          <button
            type="button"
            className="badge-toggle badge-group-toggle"
            onClick={() => setIsEarnedExpanded(prev => !prev)}
          >
            <span>{isEarnedExpanded ? "Minimera" : "Visa"}</span>
            <span aria-hidden="true">{isEarnedExpanded ? "▴" : "▾"}</span>
          </button>
        </div>
        {isEarnedExpanded && (
          <>
            {earnedBadgeGroups.length ? (
              earnedBadgeGroups.map(group => (
                <div key={`earned-${group.label}`} className="badge-type-group">
                  <div className="badge-type-title">{group.label}</div>
                  <div className="badges-grid">
                    {group.items.map(badge => (
                      <div
                        key={badge.id}
                        className={`badge-card badge-earned ${
                          selectedBadgeId === badge.id ? "badge-selected" : ""
                        }`}
                      >
                        <div className="badge-icon">
                          <span>{badge.icon}</span>
                          {badge.tier && <span className="badge-tier">{badge.tier}</span>}
                        </div>
                        <div className="badge-title">{badge.title}</div>
                        <div className="badge-description">{badge.description}</div>
                        {badge.meta && <div className="badge-meta">{badge.meta}</div>}
                        <div className="badge-actions">
                          <button
                            type="button"
                            className="badge-select"
                            onClick={() => handleBadgeSelection(badge.id)}
                            disabled={savingBadgeId === badge.id}
                          >
                            {selectedBadgeId === badge.id ? "Ta bort visning" : "Visa vid namn"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="badges-grid">
                <div className="badge-card badge-empty">
                  <div className="badge-title">Inga upplåsta ännu</div>
                  <div className="badge-description">
                    Fortsätt spela för att låsa upp dina första badges.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="badge-group">
        <div className="badge-group-header">
          <div className="badge-group-title">På väg</div>
          <button
            type="button"
            className="badge-toggle badge-group-toggle"
            onClick={() => setIsLockedExpanded(prev => !prev)}
          >
            <span>{isLockedExpanded ? "Minimera" : "Visa"}</span>
            <span aria-hidden="true">{isLockedExpanded ? "▴" : "▾"}</span>
          </button>
        </div>
        {isLockedExpanded && (
          <>
            {lockedBadgeGroups.map(group => (
              <div key={`locked-${group.label}`} className="badge-type-group">
                <div className="badge-type-title">{group.label}</div>
                <div className="badges-grid">
                  {group.items.map(badge => {
                    const progress = badge.progress;
                    const progressPercent = progress
                      ? Math.round((progress.current / progress.target) * 100)
                      : 0;
                    return (
                      <div key={badge.id} className="badge-card">
                        <div className="badge-icon">
                          <span>{badge.icon}</span>
                          {badge.tier && <span className="badge-tier">{badge.tier}</span>}
                        </div>
                        <div className="badge-title">{badge.title}</div>
                        <div className="badge-description">{badge.description}</div>
                        {badge.meta && <div className="badge-meta">{badge.meta}</div>}
                        {progress && (
                          <div className="badge-progress">
                            <div className="badge-progress-bar">
                              <div
                                className="badge-progress-fill"
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                            <span className="badge-progress-text">
                              {progress.current}/{progress.target}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
