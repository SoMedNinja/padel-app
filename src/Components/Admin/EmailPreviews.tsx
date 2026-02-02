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
          Emails
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Här kan du förhandsgranska och testa olika mailutskick innan de går ut.
        </Typography>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Veckobrev
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sammanfattar veckans spel och skickas till spelare.
        </Typography>
        {/* Note for non-coders: each preview card below shows a different type of email template. */}
        <WeeklyEmailPreview currentUserId={currentUserId} />
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          Turneringsmejl
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Skickas två timmar efter att en turnering avslutats.
        </Typography>
        <TournamentEmailPreview currentUserId={currentUserId} />
      </Box>
    </Box>
  );
}
