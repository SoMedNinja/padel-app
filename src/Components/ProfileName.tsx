import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { getBadgeIconById, getBadgeTierLabelById, getBadgeDescriptionById } from "../utils/badges";
import { stripBadgeLabelFromName } from "../utils/profileName";

interface ProfileNameProps {
  name: string;
  badgeId?: string | null;
  className?: string;
  prominent?: boolean;
}

export default function ProfileName({ name, badgeId, className = "", prominent = false }: ProfileNameProps) {
  const icon = getBadgeIconById(badgeId || null);
  const tier = getBadgeTierLabelById(badgeId || null);
  const description = getBadgeDescriptionById(badgeId || null);

  // Note for non-coders: we clean the name so it doesn't repeat any legacy merit text.
  const displayName = stripBadgeLabelFromName(name, badgeId);

  // Note for non-coders: a Chip is a small "tag" UI element that groups the icon + tier so it looks like a badge.
  const badgeLabel = icon ? `${icon}${tier ? ` ${tier}` : ""}` : "";

  if (!icon) {
    return <span className={className}>{displayName}</span>;
  }

  const badgeChip = (
    <Chip
      className="profile-name-badge"
      aria-label={`Visad merit ${tier ? `${tier} ` : ""}${icon}`}
      label={badgeLabel}
      size="small"
      variant={prominent ? "filled" : "outlined"}
      color={prominent ? "primary" : "default"}
      sx={{
        fontWeight: 800,
        fontSize: prominent ? "0.7rem" : "0.65rem",
        height: prominent ? 24 : 22,
        cursor: description ? 'help' : 'default',
        boxShadow: prominent ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
        border: prominent ? 'none' : '1px solid',
        borderColor: 'divider',
        "& .MuiChip-label": {
          px: prominent ? 1 : 0.75,
        },
      }}
    />
  );

  return (
    <Box
      component="span"
      className={`profile-name ${className}`.trim()}
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}
    >
      <Box component="span" className="profile-name-text">
        {displayName}
      </Box>
      {description ? (
        <Tooltip title={description} arrow>
          {badgeChip}
        </Tooltip>
      ) : badgeChip}
    </Box>
  );
}
