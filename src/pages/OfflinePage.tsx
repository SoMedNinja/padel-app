import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function OfflinePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const originalRoute = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("from") || "/dashboard";
  }, [location.search]);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="flex-start">
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            Du är offline just nu
          </Typography>
          <Typography color="text.secondary">
            Vi kunde inte öppna sidan eftersom internet är svagt eller saknas. När anslutningen är tillbaka kan du prova igen.
          </Typography>
        </Box>

        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
            Så reconnectar du snabbt
          </Typography>
          <Typography component="div" color="text.secondary">
            1) Kontrollera Wi-Fi/mobildata.<br />
            2) Öppna appen igen och dra ned för att uppdatera.<br />
            3) Tryck på knappen nedan för att återgå till sidan du försökte öppna.
          </Typography>
        </Box>

        {/* Note for non-coders: we save the original route in the URL so this button can retry exactly where the user came from. */}
        <Button variant="contained" onClick={() => navigate(originalRoute)}>
          Försök igen
        </Button>
      </Stack>
    </Container>
  );
}
