import React from "react";
import { Alert, AlertTitle, Typography, Box } from "@mui/material";

interface AppAlertProps {
  severity?: "error" | "warning" | "info" | "success";
  title?: string;
  children: React.ReactNode;
  sx?: any;
}

export default function AppAlert({ severity = "info", title, children, sx }: AppAlertProps) {
  return (
    <Alert severity={severity} sx={{ borderRadius: 3, ...sx }}>
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
