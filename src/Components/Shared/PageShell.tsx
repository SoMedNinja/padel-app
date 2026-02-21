import React from "react";
import { Box, Container } from "@mui/material";

interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  sectionId?: string;
}

export default function PageShell({ children, maxWidth = "lg", sectionId }: PageShellProps) {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      <Box id={sectionId} component="section">
        {/* Note for non-coders: this shared wrapper keeps spacing and width consistent so every page feels like the same app. */}
        {children}
      </Box>
    </Container>
  );
}
