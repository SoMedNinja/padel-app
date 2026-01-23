import { getBadgeIconById, getBadgeTierLabelById } from "../utils/badges";

export default function ProfileName({ name, badgeId, className = "" }) {
  const icon = getBadgeIconById(badgeId);
  const tier = getBadgeTierLabelById(badgeId);
  if (!icon) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className={`profile-name ${className}`.trim()}>
      <span className="profile-name-text">{name}</span>
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
