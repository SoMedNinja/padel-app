import React from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";
import WeeklyEmailPreview from "./WeeklyEmailPreview";
import TournamentEmailPreview from "./TournamentEmailPreview";

interface EmailPreviewsProps {
  currentUserId?: string;
}

export default function EmailPreviews({ currentUserId }: EmailPreviewsProps) {
  const [tab, setTab] = React.useState(0);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          E-post
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Här kan du förhandsgranska och testa olika mailutskick innan de går ut.
        </Typography>
      </Box>

      {/* Note for non-coders: the tabs separate weekly and tournament emails so admins can focus on one at a time. */}
      <Tabs
        value={tab}
        onChange={(_, nextValue) => setTab(nextValue)}
        indicatorColor="primary"
        textColor="primary"
        aria-label="E-postflikar"
      >
        <Tab label="Veckobrev" />
        <Tab label="Turneringar" />
      </Tabs>

      {tab === 0 && (
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
      )}

      {tab === 1 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Turneringar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Skickas två timmar efter att en turnering avslutats.
          </Typography>
          <TournamentEmailPreview currentUserId={currentUserId} />
        </Box>
      )}
    </Box>
  );
}
