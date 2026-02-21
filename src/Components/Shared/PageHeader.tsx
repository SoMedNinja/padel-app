import React from "react";
import { Typography } from "@mui/material";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {/* Note for non-coders: subtitle is short helper text that explains what this page is for. */}
          {subtitle}
        </Typography>
      ) : null}
    </>
  );
}
