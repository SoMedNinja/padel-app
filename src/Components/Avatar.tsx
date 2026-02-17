import React, { useState, useEffect } from 'react';
import { Avatar as MuiAvatar, Skeleton, Box } from "@mui/material";
import { getInitial } from "../utils/avatar";

const Avatar = React.memo(({ name, src, alt, className = "", size, sx = {}, ...props }: any) => {
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

  const label = alt || name || "Avatar";
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
            src={src}
            imgProps={{
                onLoad: () => setLoaded(true),
                onError: () => { setLoaded(true); setHasError(true); },
                loading: "lazy" // Native lazy loading
            }}
            sx={{ width: '100%', height: '100%' }} // Fill the wrapper
        >
            {getInitial(name)}
        </MuiAvatar>
    </Box>
  );
});

export default Avatar;
