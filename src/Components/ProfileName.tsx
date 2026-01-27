import React from "react";
import { Box, Chip } from "@mui/material";
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
  // Note for non-coders: a Chip is a small "tag" UI element that groups the icon + tier so it looks like a badge.
  const badgeLabel = icon ? `${icon}${tier ? ` ${tier}` : ""}` : "";
  if (!icon) {
    return <span className={className}>{displayName}</span>;
  }

  return (
    <Box
      component="span"
      className={`profile-name ${className}`.trim()}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}
    >
      <Box component="span" className="profile-name-text">
        {displayName}
      </Box>
      <Chip
        className="profile-name-badge"
        aria-label={`Visad merit ${tier ? `${tier} ` : ""}${icon}`}
        label={badgeLabel}
        size="small"
        variant="outlined"
        sx={{
          fontWeight: 700,
          fontSize: "0.65rem",
          height: 22,
          "& .MuiChip-label": {
            px: 0.75,
          },
        }}
      />
    </Box>
  );
}
