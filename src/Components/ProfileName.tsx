import React from "react";
import { Box, Chip, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getBadgeIconById, getBadgeTierLabelById, getBadgeDescriptionById } from "../utils/badges";
import { stripBadgeLabelFromName } from "../utils/profileName";

interface ProfileNameProps {
  name: string;
  badgeId?: string | null;
  className?: string;
  truncate?: boolean;
}

export default function ProfileName({ name, badgeId, className = "", truncate = false }: ProfileNameProps) {
  const icon = getBadgeIconById(badgeId || null);
  const tier = getBadgeTierLabelById(badgeId || null);
  const description = getBadgeDescriptionById(badgeId || null);

  // Note for non-coders: we clean the name so it doesn't repeat any legacy merit text.
  const displayName = stripBadgeLabelFromName(name, badgeId);

  // Note for non-coders: a Chip is a small "tag" UI element that groups the icon + tier so it looks like a badge.
  const badgeLabel = icon ? `${icon}${tier ? ` ${tier}` : ""}` : "";

  if (!icon) {
    return (
      <Box
        component="span"
        className={className}
        sx={truncate ? { display: 'inline-block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}
      >
        {displayName}
      </Box>
    );
  }

  const badgeChip = (
    <Chip
      className="profile-name-badge"
      aria-label={`Visad merit ${tier ? `${tier} ` : ""}${icon}${description ? `. ${description}` : ""}`}
      label={badgeLabel}
      size="small"
      variant="outlined"
      tabIndex={description ? 0 : -1}
      role={description ? "button" : undefined}
      sx={{
        fontWeight: 700,
        fontSize: "0.65rem",
        height: 22,
        cursor: description ? 'help' : 'default',
        transition: 'all 0.2s',
        "& .MuiChip-label": {
          px: 0.75,
        },
        "&:focus-visible": {
          outline: '2px solid',
          outlineColor: 'primary.main',
          outlineOffset: '1px',
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
        }
      }}
    />
  );

  return (
    <Box
      component="span"
      className={`profile-name ${className}`.trim()}
      // Note for non-coders: `truncate` keeps long names on one line so compact tables don't overflow.
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, flexWrap: truncate ? "nowrap" : "wrap", minWidth: 0, maxWidth: '100%' }}
    >
      <Box
        component="span"
        className="profile-name-text"
        sx={truncate ? { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : undefined}
      >
        {displayName}
      </Box>
      {description ? (
        <Tooltip
          title={description}
          arrow
          enterTouchDelay={0}
          leaveTouchDelay={3000}
        >
          {badgeChip}
        </Tooltip>
      ) : badgeChip}
    </Box>
  );
}
