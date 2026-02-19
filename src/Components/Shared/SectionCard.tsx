import { Box, Typography } from "@mui/material";
import { ReactNode } from "react";

interface SectionCardProps {
  title: string;
  children: ReactNode;
}

export default function SectionCard({ title, children }: SectionCardProps) {
  return (
    <Box
      sx={{
        mb: 2,
        borderRadius: 3,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        bgcolor: "background.paper",
        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.06)",
        p: { xs: 1.75, sm: 2 },
      }}
    >
      {/* Note for non-coders: this title helps split the page into clear blocks, similar to cards in the iOS app. */}
      <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.25, color: "text.primary" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
