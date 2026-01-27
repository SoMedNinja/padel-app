import { Avatar as MuiAvatar } from "@mui/material";
import { getInitial } from "../utils/avatar";

export default function Avatar({ name, src, alt, className = "", size, sx = {} }) {
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
}
