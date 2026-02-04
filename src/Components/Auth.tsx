import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Stack,
  Container,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import AppAlert from "./Shared/AppAlert";
import {
  Login as LoginIcon,
  PersonAdd as SignupIcon,
  HelpOutline as ResetIcon,
  ArrowForward as GuestIcon,
} from "@mui/icons-material";
import SupabaseConfigBanner from "./SupabaseConfigBanner";
import { useStore } from "../store/useStore";

interface AuthProps {
  onAuth: (user: User) => void;
  onGuest: () => void;
}

export default function Auth({ onAuth, onGuest }: AuthProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeSeverity, setNoticeSeverity] = useState<"info" | "error" | "success">("info");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setGuestModeStartedAt } = useStore();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const authTimeoutMs = 15000;

  const withTimeout = async <T,>(promise: Promise<T>, message: string): Promise<T> => {
    let timeoutId: number | undefined;
    try {
      // Note for non-coders: we cap how long the login call can wait so the button never spins forever.
      const timeoutPromise = new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(() => reject(new Error(message)), authTimeoutMs);
      });
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const resolveSiteUrl = () => {
    const authRedirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL;
    if (authRedirectUrl) {
      return authRedirectUrl.endsWith("/")
        ? authRedirectUrl.slice(0, -1)
        : authRedirectUrl;
    }
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    return siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  };

  const submit = async () => {
    if (isSubmitting) return;
    setNotice("");
    if (!email || !password) {
      setNoticeSeverity("error");
      setNotice("Fyll i både e-post och lösenord.");
      return;
    }
    if (!emailRegex.test(email)) {
      setNoticeSeverity("error");
      setNotice("Ange en giltig e-postadress.");
      return;
    }
    if (password.length < 8) {
      setNoticeSeverity("error");
      setNotice("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        const siteUrl = resolveSiteUrl();
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: siteUrl,
            },
          }),
          "Det tar längre tid än vanligt att skapa kontot. Försök igen om en stund."
        );

        if (error) {
          setNoticeSeverity("error");
          setNotice(error.message);
          return;
        }
        if (data?.session?.user) {
          onAuth(data.session.user);
          return;
        }
        setNoticeSeverity("success");
        setNotice("Bekräftelselänk skickad! Kolla din e-post för att aktivera kontot.");
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email,
            password,
          }),
          "Det tar längre tid än vanligt att logga in. Kontrollera din uppkoppling och försök igen."
        );

        if (error) {
          setNoticeSeverity("error");
          setNotice(error.message);
          return;
        }
        if (data.user) {
          // Note for non-coders: we re-enable the button even after success so the UI never gets stuck.
          onAuth(data.user);
          return;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Något gick fel vid inloggningen.";
      setNoticeSeverity("error");
      setNotice(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setNoticeSeverity("error");
      setNotice("Ange e-postadressen du vill återställa lösenordet för.");
      return;
    }
    if (!emailRegex.test(email)) {
      setNoticeSeverity("error");
      setNotice("Ange en giltig e-postadress.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: resolveSiteUrl(),
        }),
        "Det tar längre tid än vanligt att skicka återställningslänken. Försök igen om en stund."
      );
      if (error) {
        setNoticeSeverity("error");
        setNotice(error.message);
        return;
      }
      setNoticeSeverity("success");
      setNotice("Återställningslänk skickad! Kolla din e-post.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Något gick fel vid återställningen.";
      setNoticeSeverity("error");
      setNotice(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuest = () => {
    // Note for non-coders: we save the time the guest mode started so it can expire later.
    setGuestModeStartedAt(new Date().toISOString());
    onGuest();
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
      <SupabaseConfigBanner />
      <Card variant="outlined" sx={{ borderRadius: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" align="center" sx={{ mb: 4, fontWeight: 800, color: 'primary.main' }}>
            {isSignup ? "Skapa konto" : "Logga in"}
          </Typography>

          <Stack spacing={2}>
            <TextField
              fullWidth
              label="E-post"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              required
              slotProps={{ htmlInput: { "aria-required": "true" } }}
            />
            <TextField
              fullWidth
              label="Lösenord"
              variant="outlined"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              slotProps={{ htmlInput: { "aria-required": "true" } }}
            />

            {notice && <AppAlert severity={noticeSeverity} sx={{ py: 0 }}>{notice}</AppAlert>}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={submit}
              disabled={isSubmitting}
              startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : (isSignup ? <SignupIcon /> : <LoginIcon />)}
              sx={{ height: 48, fontWeight: 700 }}
            >
              {isSubmitting ? "Skickar..." : isSignup ? "Registrera" : "Logga in"}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => setIsSignup(!isSignup)}
              sx={{ fontWeight: 600 }}
            >
              {isSignup ? "Har du redan ett konto? Logga in" : "Ny spelare? Skapa konto"}
            </Button>

            {!isSignup && (
              <Tooltip title="Skicka en återställningslänk till din e-post" arrow>
                <Button
                  fullWidth
                  variant="text"
                  size="small"
                  onClick={handlePasswordReset}
                  disabled={isSubmitting}
                  startIcon={
                    isSubmitting ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <ResetIcon />
                    )
                  }
                  sx={{ opacity: 0.7 }}
                >
                  Glömt lösenord?
                </Button>
              </Tooltip>
            )}

            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleGuest}
                endIcon={<GuestIcon />}
                sx={{ borderRadius: 2 }}
              >
                Fortsätt som gäst
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
