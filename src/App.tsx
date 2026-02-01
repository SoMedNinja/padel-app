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
import { Container, Box, Typography, CircularProgress, Button, Stack } from "@mui/material";
import { useEffect, useState } from "react";
import AppAlert from "./Components/Shared/AppAlert";

export default function App() {
  const { user, setUser, isGuest, setIsGuest } = useStore();
  const {
    isLoading,
    errorMessage,
    hasCheckedProfile,
    refresh,
    isRecoveringSession,
    hasRecoveryFailed,
    recoveryError,
  } = useAuthProfile();
  const [showAuthScreen, setShowAuthScreen] = useState(false);
  const toaster = <Toaster position="top-center" richColors />;

  useRealtime();

  useEffect(() => {
    // Note for non-coders: if we’re logged in or browsing as a guest, we hide the login screen toggle.
    if (user || isGuest) {
      setShowAuthScreen(false);
    }
  }, [user, isGuest]);
  // Note for non-coders: signing out clears the saved login so you return to the login screen immediately.
  const handleSignOut = async () => {
    // Note for non-coders: we revoke the session on the server so the app doesn't auto-log you back in.
    await supabase.auth.signOut();
    setIsGuest(false);
    setUser(null);
  };

  if (isLoading) {
    return (
      <>
        {toaster}
        <Container maxWidth="sm">
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Laddar inloggning...</Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (errorMessage) {
    return (
      <>
        {toaster}
        <Container maxWidth="sm">
          <Box sx={{ mt: 8 }}>
            <AppAlert
              severity="error"
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Typography variant="body2">{errorMessage}</Typography>
                <Button color="inherit" size="small" onClick={refresh}>
                  Försök igen
                </Button>
              </Box>
            </AppAlert>
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
      </>
    );
  }

  if (!user && !isGuest) {
    if (isRecoveringSession) {
      // Note for non-coders: we try to restore your login quietly before asking you to sign in again.
      return (
        <>
          {toaster}
          <Container maxWidth="sm">
            <Box sx={{ mt: 8, textAlign: "center" }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography color="text.secondary">Återställer din inloggning...</Typography>
            </Box>
          </Container>
        </>
      );
    }

    if (hasRecoveryFailed && !showAuthScreen) {
      return (
        <>
          {toaster}
          <Container maxWidth="sm">
            <Box sx={{ mt: 8, textAlign: "center" }}>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Vi kunde inte återställa din session
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                {recoveryError
                  ? `Teknisk detalj: ${recoveryError}`
                  : "Det händer ibland om webbläsaren rensar sin lagring eller om inloggningen har gått ut."}
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Button variant="contained" onClick={refresh}>
                  Försök igen
                </Button>
                <Button variant="outlined" onClick={() => setShowAuthScreen(true)}>
                  Gå till inloggning
                </Button>
              </Stack>
            </Box>
          </Container>
        </>
      );
    }

    return (
      <>
        {toaster}
        <Auth
          onAuth={(authUser) => {
            setIsGuest(false);
            // Note for non-coders: we set a temporary user right away so the login screen can disappear.
            const metadataName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || "";
            setUser({ ...authUser, name: typeof metadataName === "string" ? metadataName.trim() : "" });
            // Note for non-coders: useAuthProfile will automatically pick up the new session via onAuthStateChange.
          }}
          onGuest={() => setIsGuest(true)}
        />
      </>
    );
  }

  if (user && !hasCheckedProfile && !isGuest) {
    // Note for non-coders: we wait to show the profile screen until we know the latest profile details.
    return (
      <>
        {toaster}
        <Container maxWidth="sm">
          <Box sx={{ mt: 8, textAlign: 'center' }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Verifierar profilen...</Typography>
          </Box>
        </Container>
      </>
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
      <>
        {toaster}
        <MainLayout>
          <ProfileSetup
            user={user}
            initialName={metadataName}
            onComplete={(updatedProfile: any) => {
              setUser({ ...user, ...updatedProfile });
            }}
          />
        </MainLayout>
      </>
    );
  }

  // Approval gate
  if (user && !user.is_admin && !user.is_approved && !isGuest) {
    return (
      <>
        {toaster}
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
      </>
    );
  }

  return (
    <>
      <ScrollToTop />
      {toaster}
      <MainLayout>
        <AppRoutes />
      </MainLayout>
    </>
  );
}
