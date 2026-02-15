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

  const getSafeRedirectUrl = () => {
    const siteUrl = resolveSiteUrl().trim();

    // Note for non-coders: auth links only work with full web addresses.
    // In some PWA/native contexts the browser origin can be "null" or "capacitor://...",
    // so we skip custom redirect values unless they are valid http/https URLs.
    if (!siteUrl) return undefined;

    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      return undefined;
    }

    return undefined;
  };

  const toFriendlyAuthError = (message: string) => {
    const normalized = message.toLowerCase();

    if (normalized.includes("invalid login credentials") || normalized.includes("invalid email or password")) {
      return "Fel e-post eller lösenord. Kontrollera att kontot är bekräftat via länken i din e-post och försök igen.";
    }

    if (normalized.includes("email not confirmed") || normalized.includes("email not verified")) {
      return "Kontot är inte bekräftat ännu. Öppna länken i bekräftelsemejlet först.";
    }

    if (normalized.includes("data couldn't be read because it is missing")) {
      return "Kunde inte skapa konto just nu. Testa igen om en stund eller använd en annan webbläsare.";
    }

    if (normalized.includes("network") || normalized.includes("fetch")) {
      return "Nätverksfel. Kontrollera din uppkoppling och försök igen.";
    }

    return message;
  };

  const resendConfirmationEmail = async (normalizedEmail: string, normalizedPassword: string) => {
    const redirectUrl = getSafeRedirectUrl();
    const { error } = await withTimeout(
      supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword,
        options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined,
      }),
      "Det tar längre tid än vanligt att skicka nytt bekräftelsemejl. Försök igen om en stund."
    );

    if (error) {
      setNoticeSeverity("error");
      setNotice(toFriendlyAuthError(error.message));
      return;
    }

    setNoticeSeverity("success");
    setNotice("Nytt bekräftelsemejl skickat. Öppna länken i mejlet och försök logga in igen.");
  };

  const submit = async () => {
    if (isSubmitting) return;
    setNotice("");
    // Note for non-coders: we only remove accidental spaces around the email.
    // We do NOT force lowercase here, because some identity providers treat letter case strictly.
    const normalizedEmail = email.trim();
    const normalizedPassword = password;

    if (!normalizedEmail || !normalizedPassword) {
      setNoticeSeverity("error");
      setNotice("Fyll i både e-post och lösenord.");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      setNoticeSeverity("error");
      setNotice("Ange en giltig e-postadress.");
      return;
    }
    if (isSignup && normalizedPassword.length < 8) {
      setNoticeSeverity("error");
      setNotice("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignup) {
        const redirectUrl = getSafeRedirectUrl();
        const { data, error } = await withTimeout(
          supabase.auth.signUp({
            email: normalizedEmail,
            password: normalizedPassword,
            options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined,
          }),
          "Det tar längre tid än vanligt att skapa kontot. Försök igen om en stund."
        );

        if (error) {
          setNoticeSeverity("error");
          setNotice(toFriendlyAuthError(error.message));
          return;
        }

        // Note for non-coders: we persist normalized input so follow-up login attempts use clean values.
        setEmail(normalizedEmail);
        setPassword(normalizedPassword);

        if (data?.session?.user) {
          onAuth(data.session.user);
          return;
        }

        setIsSignup(false);
        setNoticeSeverity("success");
        setNotice("Bekräftelselänk skickad! Kolla din e-post för att aktivera kontot.");
      } else {
        const { data, error } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: normalizedPassword,
          }),
          "Det tar längre tid än vanligt att logga in. Kontrollera din uppkoppling och försök igen."
        );

        if (error) {
          const loweredError = error.message.toLowerCase();
          if (
            loweredError.includes("invalid login credentials") ||
            loweredError.includes("invalid email or password")
          ) {
            await resendConfirmationEmail(normalizedEmail, normalizedPassword);
            return;
          }

          setNoticeSeverity("error");
          setNotice(toFriendlyAuthError(error.message));
          return;
        }

        setEmail(normalizedEmail);
        setPassword(normalizedPassword);

        if (data.user) {
          // Note for non-coders: we re-enable the button even after success so the UI never gets stuck.
          onAuth(data.user);
          return;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Något gick fel vid inloggningen.";
      setNoticeSeverity("error");
      setNotice(toFriendlyAuthError(message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    // Note for non-coders: for password reset we use the same email cleanup as sign-in,
    // so users always target the exact account they entered.
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setNoticeSeverity("error");
      setNotice("Ange e-postadressen du vill återställa lösenordet för.");
      return;
    }
    if (!emailRegex.test(normalizedEmail)) {
      setNoticeSeverity("error");
      setNotice("Ange en giltig e-postadress.");
      return;
    }

    const redirectUrl = getSafeRedirectUrl();

    setIsSubmitting(true);
    try {
      const { error } = await withTimeout(
        supabase.auth.resetPasswordForEmail(
          normalizedEmail,
          redirectUrl
            ? {
                redirectTo: redirectUrl,
              }
            : undefined
        ),
        "Det tar längre tid än vanligt att skicka återställningslänken. Försök igen om en stund."
      );
      if (error) {
        setNoticeSeverity("error");
        setNotice(toFriendlyAuthError(error.message));
        return;
      }
      setEmail(normalizedEmail);
      setNoticeSeverity("success");
      setNotice("Återställningslänk skickad! Kolla din e-post.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Något gick fel vid återställningen.";
      setNoticeSeverity("error");
      setNotice(toFriendlyAuthError(message));
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
      <Card>
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
