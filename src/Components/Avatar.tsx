import React, { useState, useEffect } from 'react';
import { Avatar as MuiAvatar, Skeleton, Box, BoxProps } from "@mui/material";
import { getInitial } from "../utils/avatar";
import { getPlayerColor } from "../utils/colors";

interface AvatarProps extends BoxProps {
  name?: string;
  src?: string | null;
  alt?: string;
  size?: number | string;
}

const Avatar = React.memo(({ name, src, alt, className = "", size, sx = {}, ...props }: AvatarProps) => {
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If no src provided, we consider it "loaded" (showing fallback) immediately.
  const hasSrc = Boolean(src);

  useEffect(() => {
      if (!src) {
          setLoaded(true);
      } else {
          setLoaded(false);
          setHasError(false);
      }
  }, [src]);

  // If alt is explicitly provided (even empty string), use it.
  // Otherwise fall back to a descriptive label using the name, or "Avatar" generic.
  const label = alt !== undefined ? alt : (name ? `Avatar för ${name}` : "Avatar");
  const dimension = size || 40;

  // We merge sx to ensure the wrapper gets positioning/size/margin if passed.
  const wrapperSx = {
    position: 'relative',
    display: 'inline-flex',
    width: dimension,
    height: dimension,
    borderRadius: '50%', // Ensure circular shape for the wrapper so it plays nice with layout
    ...sx
  };

  // If we are loading an image, show skeleton.
  const showSkeleton = hasSrc && !loaded && !hasError;
  const isRenderingImage = hasSrc && !hasError;

  return (
    <Box
        className={className}
        sx={wrapperSx}
        {...props}
    >
        {showSkeleton && (
            <Skeleton
                variant="circular"
                width="100%"
                height="100%"
                sx={{ position: 'absolute', inset: 0, zIndex: 1 }}
            />
        )}
        <MuiAvatar
            alt={label}
            src={src || undefined}
            // If we are NOT rendering an image (e.g. text fallback), we need to ensure the container is accessible.
            // But if we ARE rendering an image, the image tag itself handles accessibility via alt.
            aria-label={!isRenderingImage && label ? label : undefined}
            role={label === "" ? "presentation" : (!isRenderingImage ? "img" : undefined)}
            imgProps={{
                onLoad: () => setLoaded(true),
                onError: () => { setLoaded(true); setHasError(true); },
                loading: "lazy" // Native lazy loading
            }}
            sx={{
                width: '100%',
                height: '100%',
                bgcolor: !isRenderingImage ? getPlayerColor(name) : undefined,
                color: '#fff', // Ensure contrast
                fontWeight: 600,
            }} // Fill the wrapper
        >
            {getInitial(name)}
        </MuiAvatar>
    </Box>
  );
});

export default Avatar;
