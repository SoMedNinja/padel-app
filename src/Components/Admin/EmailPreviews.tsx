import { Box, Divider, Typography } from "@mui/material";
import WeeklyEmailPreview from "./WeeklyEmailPreview";
import TournamentEmailPreview from "./TournamentEmailPreview";

interface EmailPreviewsProps {
  currentUserId?: string;
}

export default function EmailPreviews({ currentUserId }: EmailPreviewsProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Email previews
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Här kan du förhandsgranska och testa olika mailutskick innan de går ut.
        </Typography>
      </Box>

      {/* Note for non-coders: each preview card below shows a different type of email template. */}
      <WeeklyEmailPreview currentUserId={currentUserId} />

      <Divider />

      <TournamentEmailPreview currentUserId={currentUserId} />
    </Box>
  );
}
