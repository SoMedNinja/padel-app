import React from "react";
import { useSearchParams } from "react-router-dom";
import MatchForm from "../Components/MatchForm";
import { useStore } from "../store/useStore";
import { useEloStats } from "../hooks/useEloStats";
import { Box, Container, Typography, Button } from "@mui/material";
import AppAlert from "../Components/Shared/AppAlert";

export default function SingleGamePage() {
  const [searchParams] = useSearchParams();
  const mode = (searchParams.get("mode") as "1v1" | "2v2") || "2v2";

  const { user, isGuest, setIsGuest } = useStore();

  // Note for non-coders: switching off guest mode sends you back to the login screen.
  const handleGuestLogin = () => {
    setIsGuest(false);
  };

  // Optimization: Use the memoized useEloStats hook instead of manually fetching and
  // re-calculating ELO on every render. This ensures referential stability and performance.
  const { eloPlayers, allMatches, profiles, eloDeltaByMatch, isLoading } = useEloStats();

  if (isGuest) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <AppAlert severity="info" title="Logga in för att lägga till matcher">
          <Box component="span">
            {/* Note for non-coders: guests can browse stats, but saving a match needs a real account. */}
            Som gäst kan du utforska statistiken, men du behöver ett konto för att spara matcher.
          </Box>
          <Box sx={{ mt: 2 }}>
            {/* Note for non-coders: this button takes you to the same login flow as the main menu. */}
            <Button variant="contained" onClick={handleGuestLogin}>
              Logga in
            </Button>
          </Box>
        </AppAlert>
      </Container>
    );
  }

  return (
    <div id="single-game">
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <Typography color="text.secondary">Laddar speldata...</Typography>
        </Box>
      ) : (
        <MatchForm
          user={user}
          profiles={profiles}
          matches={allMatches}
          eloPlayers={eloPlayers}
          eloDeltaByMatch={eloDeltaByMatch}
          mode={mode}
        />
      )}
    </div>
  );
}
