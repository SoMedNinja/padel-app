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
    authStatus,
    isLoading,
    errorMessage,
    hasCheckedProfile,
    profileName,
    refresh,
    isRecoveringSession,
    hasRecoveryFailed,
    recoveryError,
    isAutoRecoveryRetry,
    showLoadingHint,
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
            {showLoadingHint && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Det tar lite längre tid än vanligt, vi fortsätter kontrollera din session.
              </Typography>
            )}
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

  if (!user && !isGuest && authStatus !== "unauthenticated") {
    // Note for non-coders: if we still haven't confirmed you're logged out, keep waiting instead of flashing login.
    return (
      <>
        {toaster}
        <Container maxWidth="sm">
          <Box sx={{ mt: 8, textAlign: "center" }}>
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography color="text.secondary">Kontrollerar din session...</Typography>
          </Box>
        </Container>
      </>
    );
  }

  if (!user && !isGuest && authStatus === "unauthenticated") {
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

    if (isRecoveringSession) {
      // Note for non-coders: we try to restore your login quietly before asking you to sign in again.
      return (
        <>
          {toaster}
          <Container maxWidth="sm">
            <Box sx={{ mt: 8, textAlign: "center" }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography color="text.secondary">Återställer din inloggning...</Typography>
              {/* Note for non-coders: this small hint reassures you when the app retries on its own. */}
              {isAutoRecoveryRetry && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Försöker igen...
                </Typography>
              )}
            </Box>
          </Container>
        </>
      );
    }

    return (
      <>
        {toaster}
        <Auth
          onAuth={() => {
            setIsGuest(false);
            // Note for non-coders: we wait for useAuthProfile to load the full profile (roles/flags included)
            // before rendering the app, which prevents routes from briefly disappearing after login.
            void refresh();
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
  // Note for non-coders: we include user.name so returning users aren't incorrectly asked to set up their profile again.
  const resolvedName = [
    profileName,
    user?.name,
    user?.user_metadata?.full_name,
    user?.user_metadata?.name,
  ].reduce((firstValidName, candidate) => {
    if (firstValidName) {
      return firstValidName;
    }

    return typeof candidate === "string" ? candidate.trim() : "";
  }, "");
  const hasValidName = resolvedName.length > 0;
  if (user && !hasValidName && !isGuest) {
    // Note for non-coders: we prefill the setup form with any name we can find.

    return (
      <>
        {toaster}
        <MainLayout>
          <ProfileSetup
            user={user}
            initialName={resolvedName}
            onComplete={(updatedProfile: any) => {
              setUser({ ...user, ...updatedProfile });
            }}
          />
        </MainLayout>
      </>
    );
  }

  // Approval gate
  // Note for non-coders: we only block if approval is explicitly false,
  // so a just-signed-in user isn't blocked before their profile is loaded.
  if (user && !user.is_admin && user.is_approved === false && !isGuest) {
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
