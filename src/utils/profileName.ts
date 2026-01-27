import { getBadgeLabelById } from "./badges";

const BADGE_TRAILING_PATTERN = /\s*[\p{Extended_Pictographic}](?:\s*[IVX]+)?$/u;
// Note for non-coders: this removes any badge tag (emoji + tier) so only the real name is saved.

export const stripBadgeLabelFromName = (name: string, badgeId?: string | null) => {
  const trimmedName = name.trim();
  if (!trimmedName) return "";

  const badgeLabel = getBadgeLabelById(badgeId);
  let normalizedName = badgeLabel && trimmedName.endsWith(badgeLabel)
    ? trimmedName.slice(0, trimmedName.length - badgeLabel.length).trim()
    : trimmedName;

  normalizedName = normalizedName.replace(BADGE_TRAILING_PATTERN, "").trim();
  return normalizedName;
};
