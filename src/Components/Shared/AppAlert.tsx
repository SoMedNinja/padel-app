import React from "react";
import { Alert, AlertTitle, Typography, Box } from "@mui/material";
import type { AlertProps } from "@mui/material/Alert";

interface AppAlertProps extends AlertProps {
  title?: string;
  children: React.ReactNode;
}

export default function AppAlert({ severity = "info", title, children, sx, onClick, ...alertProps }: AppAlertProps) {
  const isInteractive = Boolean(onClick);

  return (
    <Alert
      severity={severity}
      sx={{
        borderRadius: 3,
        cursor: isInteractive ? 'pointer' : 'default',
        ...sx
      }}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e as any);
        }
      } : undefined}
      {...alertProps}
    >
      {title && <AlertTitle sx={{ fontWeight: 800 }}>{title}</AlertTitle>}
      <Box sx={{ "& > p": { m: 0 } }}>
        {typeof children === "string" ? (
          <Typography variant="body2">{children}</Typography>
        ) : (
          children
        )}
      </Box>
    </Alert>
  );
}
