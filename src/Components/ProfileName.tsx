import React from "react";
import { getBadgeIconById, getBadgeTierLabelById } from "../utils/badges";
import { stripBadgeLabelFromName } from "../utils/profileName";

interface ProfileNameProps {
  name: string;
  badgeId?: string | null;
  className?: string;
}

export default function ProfileName({ name, badgeId, className = "" }: ProfileNameProps) {
  const icon = getBadgeIconById(badgeId || null);
  const tier = getBadgeTierLabelById(badgeId || null);
  // Note for non-coders: we clean the name so it doesn't repeat the badge text next to the badge icon.
  const displayName = badgeId ? stripBadgeLabelFromName(name, badgeId) : name;
  if (!icon) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <span className={`profile-name ${className}`.trim()}>
      <span className="profile-name-text">{displayName}</span>
      <span
        className="profile-name-badge"
        aria-label={`Visad merit ${tier ? `${tier} ` : ""}${icon}`}
      >
        <span className="profile-name-emoji" aria-hidden="true">{icon}</span>
        {tier && <span className="profile-name-tier" aria-hidden="true">{tier}</span>}
      </span>
    </span>
  );
}
