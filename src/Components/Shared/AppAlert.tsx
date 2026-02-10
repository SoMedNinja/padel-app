import React from "react";
import { Alert, AlertTitle, Typography, Box } from "@mui/material";
import type { AlertProps } from "@mui/material/Alert";

interface AppAlertProps extends AlertProps {
  title?: string;
  children: React.ReactNode;
}

export default function AppAlert({ severity = "info", title, children, sx, ...alertProps }: AppAlertProps) {
  return (
    <Alert severity={severity} sx={{ borderRadius: 3, ...sx }} {...alertProps}>
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
