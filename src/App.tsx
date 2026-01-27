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
  // Note for non-coders: we sign out locally first so the browser forgets the login right away.
  const handleSignOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
    setIsGuest(false);
    setUser(null);
  };

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
            onClick={handleSignOut}
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
        onAuth={(_authUser) => {
          setIsGuest(false);
          // Note for non-coders: we re-check the saved profile so we can reuse your existing name.
          refresh();
        }}
        onGuest={() => setIsGuest(true)}
      />
    );
  }

  // Check if profile setup is needed (require a non-empty name).
  // Note for non-coders: we look for a name in both the profile record and the login metadata so
  // returning users don't get stuck on the setup screen if their name was saved elsewhere.
  // Note for non-coders: some older profiles store the name under "full_name", so we check both fields.
  const profileName = user?.name?.trim() || user?.full_name?.trim() || "";
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const resolvedName = profileName || metadataName.trim();
  const hasValidName = resolvedName.length > 0;
  if (user && !hasValidName && !isGuest) {
    // Note for non-coders: we prefill the setup form with any name we can find.

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
            <Button variant="outlined" onClick={handleSignOut}>
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
