import { Toaster } from "sonner";
import { supabase } from "./supabaseClient";
import { useStore } from "./store/useStore";
import Auth from "./Components/Auth";
import ProfileSetup from "./Components/ProfileSetup";
import MainLayout from "./layouts/MainLayout";
import AppRoutes from "./AppRoutes";
import { useRealtime } from "./hooks/useRealtime";
import ScrollToTop from "./Components/ScrollToTop";
import { useAuthProfile } from "./hooks/useAuthProfile";
import { Container, Box, Typography, CircularProgress, Alert, Button, Stack } from "@mui/material";

export default function App() {
  const { user, setUser, isGuest, setIsGuest } = useStore();
  const { isLoading, errorMessage, refresh } = useAuthProfile();

  useRealtime();

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <CircularProgress size={40} sx={{ mb: 2 }} />
          <Typography color="text.secondary">Laddar inloggning...</Typography>
        </Box>
      </Container>
    );
  }

  if (errorMessage) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Alert
            severity="error"
            action={
              <Stack direction="row" spacing={1}>
                <Button color="inherit" size="small" onClick={refresh}>
                  Försök igen
                </Button>
              </Stack>
            }
          >
            {errorMessage}
          </Alert>
          <Button
            fullWidth
            variant="text"
            sx={{ mt: 2 }}
            onClick={() => {
              supabase.auth.signOut();
              setIsGuest(false);
              setUser(null);
            }}
          >
            Återgå till inloggningssidan
          </Button>
        </Box>
      </Container>
    );
  }

  if (!user && !isGuest) {
    return (
      <Auth
        onAuth={(authUser) => {
          setIsGuest(false);
          setUser({ ...authUser } as any);
        }}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  // Check if profile setup is needed (require a non-empty name)
  const hasValidName = user?.name && user.name.trim().length > 0;
  if (user && !hasValidName && !isGuest) {
    // Try to get name from metadata as fallback for the setup field
    const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || "";

    return (
      <MainLayout>
        <ProfileSetup
          user={user}
          initialName={metadataName}
          onComplete={(updatedProfile: any) => {
            setUser({ ...user, ...updatedProfile });
          }}
        />
      </MainLayout>
    );
  }

  // Approval gate
  if (user && !user.is_admin && !user.is_approved && !isGuest) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ mt: 8, textAlign: 'center', p: 4, bgcolor: 'background.paper', borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 800 }}>Väntar på godkännande</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            En administratör behöver godkänna din åtkomst innan du kan använda
            appen fullt ut.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="contained" onClick={refresh}>
              Uppdatera status
            </Button>
            <Button variant="outlined" onClick={() => supabase.auth.signOut()}>
              Logga ut
            </Button>
          </Stack>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <ScrollToTop />
      <Toaster position="top-center" richColors />
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </>
  );
}
