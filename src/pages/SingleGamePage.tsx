import React from "react";
import MatchForm from "../Components/MatchForm";
import { useStore } from "../store/useStore";
import { useProfiles } from "../hooks/useProfiles";
import { useMatches } from "../hooks/useMatches";
import { calculateElo } from "../utils/elo";
import { Match, Profile } from "../types";
import { Alert, Box, Container, Typography } from "@mui/material";

export default function SingleGamePage() {
  const { user, isGuest } = useStore();
  const { data: profiles = [] as Profile[] } = useProfiles();
  const { data: matches = [] as Match[] } = useMatches({ type: "all" });

  const allEloPlayers = calculateElo(matches, profiles);

  if (isGuest) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info">
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Logga in för att lägga till matcher
          </Typography>
          <Box component="span">
            {/* Note for non-coders: guests can browse stats, but saving a match needs a real account. */}
            Som gäst kan du utforska statistiken, men du behöver ett konto för att spara matcher.
          </Box>
        </Alert>
      </Container>
    );
  }

  return (
    <div id="single-game">
      <MatchForm
        user={user}
        profiles={profiles}
        matches={matches}
        eloPlayers={allEloPlayers}
      />
    </div>
  );
}
