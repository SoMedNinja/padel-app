import React from 'react';
import { Avatar as MuiAvatar } from "@mui/material";
import { getInitial } from "../utils/avatar";

const Avatar = React.memo(({ name, src, alt, className = "", size, sx = {} }: any) => {
  const label = alt || name || "Avatar";

  const mergedSx = {
    width: size || 40,
    height: size || 40,
    ...sx
  };

  return (
    <MuiAvatar
      alt={label}
      src={src}
      className={className}
      sx={mergedSx}
    >
      {getInitial(name)}
    </MuiAvatar>
  );
});

export default Avatar;
