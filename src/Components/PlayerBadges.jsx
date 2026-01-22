import { useMemo, useState } from "react";
import { buildPlayerBadgeStats, buildPlayerBadges } from "../utils/badges";

const visibleBadgeLimit = 6;

export default function PlayerBadges({
  matches = [],
  profiles = [],
  userId,
  nameToIdMap
}) {
  const [showAllBadges, setShowAllBadges] = useState(false);
  const badgeStats = useMemo(
    () => buildPlayerBadgeStats(matches, profiles, userId, nameToIdMap),
    [matches, profiles, userId, nameToIdMap]
  );
  const badgeSummary = useMemo(() => buildPlayerBadges(badgeStats), [badgeStats]);
  const visibleEarnedBadges = showAllBadges
    ? badgeSummary.earnedBadges
    : badgeSummary.earnedBadges.slice(0, visibleBadgeLimit);
  const visibleLockedBadges = showAllBadges
    ? badgeSummary.lockedBadges
    : badgeSummary.lockedBadges.slice(0, visibleBadgeLimit);

  return (
    <div className="badges-section">
      <div className="badges-header">
        <div>
          <h3>Meriter</h3>
          <p className="muted">
            {badgeSummary.totalEarned} av {badgeSummary.totalBadges} badges upplåsta
          </p>
        </div>
        {badgeSummary.totalBadges > visibleBadgeLimit && (
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowAllBadges(prev => !prev)}
          >
            {showAllBadges ? "Visa färre" : "Visa alla"}
          </button>
        )}
      </div>

      {badgeSummary.totalBadges === 0 ? (
        <p className="muted">Spela några matcher för att låsa upp badges.</p>
      ) : (
        <>
          <div className="badge-group">
            <div className="badge-group-title">Upplåsta</div>
            <div className="badges-grid">
              {visibleEarnedBadges.length ? (
                visibleEarnedBadges.map(badge => (
                  <div key={badge.id} className="badge-card badge-earned">
                    <div className="badge-icon">{badge.icon}</div>
                    <div className="badge-title">{badge.title}</div>
                    <div className="badge-description">{badge.description}</div>
                    {badge.meta && <div className="badge-meta">{badge.meta}</div>}
                  </div>
                ))
              ) : (
                <div className="badge-card badge-empty">
                  <div className="badge-title">Inga upplåsta ännu</div>
                  <div className="badge-description">
                    Fortsätt spela för att låsa upp dina första badges.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="badge-group">
            <div className="badge-group-title">På väg</div>
            <div className="badges-grid">
              {visibleLockedBadges.map(badge => {
                const progress = badge.progress;
                const progressPercent = progress
                  ? Math.round((progress.current / progress.target) * 100)
                  : 0;
                return (
                  <div key={badge.id} className="badge-card">
                    <div className="badge-icon">{badge.icon}</div>
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
        </>
      )}
    </div>
  );
}
