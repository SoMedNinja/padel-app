import { Alert, Box, Button, Chip, Stack, Typography, Divider, FormControlLabel, Switch, TextField, MenuItem } from "@mui/material";
import { useEffect, useState } from "react";
import {
  buildWebPermissionSnapshots,
  ensureNotificationPermission,
  loadNotificationPreferences,
  saveNotificationPreferencesWithSync,
  registerPushServiceWorker,
} from "../../services/webNotificationService";
import { SHARED_PERMISSION_CAPABILITY_LABELS, SHARED_PERMISSION_STATE_LABELS, WEB_PERMISSION_CAPABILITY_HELP } from "../../shared/permissionsCopy";
import { SHARED_PERMISSION_PLATFORM_DIFFERENCES } from "../../shared/permissionCapabilityMatrix";
import { PermissionStatusSnapshot } from "../../types/permissions";
import { NotificationEventType, NotificationPreferences, NOTIFICATION_EVENT_TYPES } from "../../types/notifications";

const LAST_CHECKED_AT_KEY = "permissions.lastCheckedAt.v1";
const LAST_SUCCESSFUL_PUSH_SETUP_AT_KEY = "permissions.lastSuccessfulPushSetupAt.v1";

const CHIP_COLORS: Record<PermissionStatusSnapshot["state"], "success" | "error" | "warning" | "default"> = {
  allowed: "success",
  blocked: "error",
  limited: "warning",
  action_needed: "default",
};

interface WebPermissionsPanelProps {
  onNotificationPermissionChanged: () => Promise<void>;
}

function notificationSettingsGuidance(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "Öppna iOS-inställningar > Notiser > den här appen och tillåt notiser. Om du använder Safari behöver du först lägga appen på hemskärmen.";
  }
  if (/firefox/.test(ua)) {
    return "Öppna Firefox webbplatsinställningar, hitta Notiser för den här sidan och byt till Tillåt.";
  }
  if (/edg\//.test(ua) || /edgios/.test(ua)) {
    return "Öppna webbplatsbehörigheter i Edge, sätt Notiser till Tillåt och uppdatera sidan.";
  }
  return "Öppna webbläsarens webbplatsinställningar för sidan, sätt Notiser till Tillåt och uppdatera.";
}

const EVENT_LABELS: Record<NotificationEventType, string> = {
  scheduled_match_new: "Ny schemalagd match",
  match_result_new: "Nytt matchresultat",
  availability_poll_reminder: "Påminnelse om tillgänglighetspoll",
  admin_announcement: "Adminmeddelanden",
};

export default function WebPermissionsPanel({ onNotificationPermissionChanged }: WebPermissionsPanelProps) {
  const [snapshots, setSnapshots] = useState<PermissionStatusSnapshot[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(() => localStorage.getItem(LAST_CHECKED_AT_KEY));
  const [lastSuccessfulPushSetupAt, setLastSuccessfulPushSetupAt] = useState<string | null>(() =>
    localStorage.getItem(LAST_SUCCESSFUL_PUSH_SETUP_AT_KEY)
  );

  const formatTimestamp = (iso: string | null): string => {
    if (!iso) return "Inte ännu";
    const parsed = new Date(iso);
    return Number.isNaN(parsed.getTime()) ? "Inte ännu" : parsed.toLocaleString();
  };

  const reloadSnapshots = async () => {
    const data = await buildWebPermissionSnapshots();
    setSnapshots(data);

    // Note for non-coders: we load the raw preferences so the UI switches match stored state.
    setPreferences(loadNotificationPreferences());

    const nowIso = new Date().toISOString();
    setLastCheckedAt(nowIso);
    localStorage.setItem(LAST_CHECKED_AT_KEY, nowIso);

    const notifications = data.find((snapshot) => snapshot.capability === "notifications");
    if (notifications?.state === "allowed") {
      setLastSuccessfulPushSetupAt(nowIso);
      localStorage.setItem(LAST_SUCCESSFUL_PUSH_SETUP_AT_KEY, nowIso);
    }
  };

  useEffect(() => {
    void reloadSnapshots();
  }, []);

  const handlePreferenceChange = async (newPrefs: NotificationPreferences) => {
    setPreferences(newPrefs);
    await saveNotificationPreferencesWithSync(newPrefs);
  };

  const toggleMaster = () => {
    if (!preferences) return;
    handlePreferenceChange({ ...preferences, enabled: !preferences.enabled });
  };

  const toggleEvent = (type: NotificationEventType) => {
    if (!preferences) return;
    handlePreferenceChange({
      ...preferences,
      eventToggles: {
        ...preferences.eventToggles,
        [type]: !preferences.eventToggles[type],
      },
    });
  };

  const toggleQuietHours = () => {
    if (!preferences) return;
    handlePreferenceChange({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        enabled: !preferences.quietHours.enabled,
      },
    });
  };

  const updateQuietHours = (field: "startHour" | "endHour", value: string | number) => {
    if (!preferences) return;
    const num = typeof value === 'string' ? parseInt(value, 10) : value;
    if (isNaN(num) || num < 0 || num > 23) return;
    handlePreferenceChange({
      ...preferences,
      quietHours: {
        ...preferences.quietHours,
        [field]: num,
      },
    });
  };

  const handleNotificationsAction = async (snapshot: PermissionStatusSnapshot) => {
    if (snapshot.state === "blocked" || snapshot.state === "limited") {
      setActionMessage(notificationSettingsGuidance());
      return;
    }

    // Note for non-coders:
    // If permission is already granted, this re-runs full push setup so the missing endpoint can be created.
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      await registerPushServiceWorker(loadNotificationPreferences());
      await onNotificationPermissionChanged();
      setActionMessage("Push-konfigurationen kördes igen. Om allt gick bra registrerades endpointen nu.");
      return;
    }

    await ensureNotificationPermission();
    await onNotificationPermissionChanged();
    setActionMessage("Notiskontrollen kördes igen. Om behörighet är tillåten kan du sedan trycka på 'Kör konfiguration igen'.");
  };

  const handleBackgroundRefreshAction = async () => {
    if (!("serviceWorker" in navigator)) {
      setActionMessage("Den här webbläsaren stödjer inte service workers, så bakgrundsuppdatering kan inte aktiveras här.");
      return;
    }

    const existingRegistration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!existingRegistration) {
      await registerPushServiceWorker(loadNotificationPreferences());
      setActionMessage("Installationen av service worker kördes igen. Låt fliken vara öppen några sekunder och testa sedan kontrollen igen.");
      return;
    }

    await existingRegistration.update();
    if (!existingRegistration.active) {
      setActionMessage("Service worker finns men är inte aktiv ännu. Ladda om appen (eller installera om PWA på iOS) och testa igen.");
      return;
    }

    setActionMessage("Kontrollen för bakgrundsuppdatering kördes igen. Service worker är aktiv.");
  };

  const handlePasskeyAction = async () => {
    if (!("PublicKeyCredential" in window)) {
      setActionMessage("Den här webbläsaren exponerar inte WebAuthn-API:er, så plattformsnycklar (passkeys) är inte tillgängliga.");
      return;
    }

    const hasPlatformAuthenticator =
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : false;

    setActionMessage(
      hasPlatformAuthenticator
        ? "En plattformsautentiserare hittades. Du kan fortsätta med passkey-konfiguration på enheten."
        : "WebAuthn finns, men ingen plattformsautentiserare är tillgänglig just nu. Kontrollera enhetens låsskärm/biometriska inställningar."
    );
  };

  const handleAction = async (snapshot: PermissionStatusSnapshot) => {
    try {
      if (snapshot.capability === "notifications") {
        await handleNotificationsAction(snapshot);
      } else if (snapshot.capability === "background_refresh") {
        await handleBackgroundRefreshAction();
      } else if (snapshot.capability === "biometric_passkey") {
        await handlePasskeyAction();
      }
    } catch (error) {
      console.error("Permission action failed:", error);
      setActionMessage(`Ett fel uppstod: ${error instanceof Error ? error.message : "Okänt fel"}. Kontrollera din internetanslutning och försök igen.`);
    } finally {
      await reloadSnapshots();
    }
  };

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Samlad panel för behörigheter</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {/* Note for non-coders: this panel translates technical browser APIs into the same state words used on iOS. */}
        Samma statusmodell i alla klienter: Tillåten, Blockerad, Begränsad eller Åtgärd krävs.
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        {/* Note for non-coders: this is the exact time the app most recently re-ran all permission checks. */}
        Senast kontrollerad: {formatTimestamp(lastCheckedAt)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        {/* Note for non-coders: this only updates when push is fully ready (permission + endpoint). */}
        Senaste lyckade push-konfiguration: {formatTimestamp(lastSuccessfulPushSetupAt)}
      </Typography>

      <Stack spacing={1.5}>
        {snapshots.map((snapshot) => (
          <Box key={snapshot.capability} sx={{ p: 1.5, borderRadius: 1.5, bgcolor: "background.default" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {SHARED_PERMISSION_CAPABILITY_LABELS[snapshot.capability]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {WEB_PERMISSION_CAPABILITY_HELP[snapshot.capability]}
                </Typography>
              </Box>
              <Chip
                label={SHARED_PERMISSION_STATE_LABELS[snapshot.state]}
                color={CHIP_COLORS[snapshot.state]}
                size="small"
              />
            </Stack>

            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              {snapshot.detail}
            </Typography>

            <Button
              sx={{ mt: 1 }}
              variant="outlined"
              size="small"
              onClick={() => void handleAction(snapshot)}
              disabled={!snapshot.actionEnabled}
            >
              {snapshot.actionLabel}
            </Button>
          </Box>
        ))}
      </Stack>

      {actionMessage ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          {/* Note for non-coders: this is plain-language feedback after each action button click. */}
          {actionMessage}
        </Alert>
      ) : null}

      <Alert severity="info" sx={{ mt: 2 }}>
        {SHARED_PERMISSION_PLATFORM_DIFFERENCES}
      </Alert>

      {preferences && (
        <>
          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Notifieringsinställningar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Anpassa vilka notiser du vill ha och när.
          </Typography>

          <FormControlLabel
            control={<Switch checked={preferences.enabled} onChange={toggleMaster} />}
            label={<Typography fontWeight={600}>Tillåt notiser</Typography>}
            sx={{ mb: 2, display: 'block' }}
          />

          <Box sx={{ opacity: preferences.enabled ? 1 : 0.5, pointerEvents: preferences.enabled ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>Händelser</Typography>
            <Stack spacing={1} sx={{ ml: 1 }}>
              {NOTIFICATION_EVENT_TYPES.filter(type => type !== "admin_announcement").map((type) => (
                <FormControlLabel
                  key={type}
                  control={<Switch size="small" checked={preferences.eventToggles[type]} onChange={() => toggleEvent(type)} />}
                  label={<Typography variant="body2">{EVENT_LABELS[type]}</Typography>}
                />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <FormControlLabel
              control={<Switch checked={preferences.quietHours.enabled} onChange={toggleQuietHours} />}
              label={<Typography variant="subtitle2" fontWeight={700}>Aktivera tysta timmar</Typography>}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
              Tysta timmar pausar notiser mellan start och slut. Exempel: 22 till 07 stoppar nattnotiser.
            </Typography>

            {preferences.quietHours.enabled && (
              <Stack direction="row" spacing={2} sx={{ ml: 4 }}>
                <TextField
                  select
                  size="small"
                  label="Start"
                  value={preferences.quietHours.startHour}
                  onChange={(e) => updateQuietHours("startHour", e.target.value)}
                  sx={{ width: 100 }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => <MenuItem key={`start-${hour}`} value={hour}>{`${hour.toString().padStart(2, "0")}:00`}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Slut"
                  value={preferences.quietHours.endHour}
                  onChange={(e) => updateQuietHours("endHour", e.target.value)}
                  sx={{ width: 100 }}
                >
                  {Array.from({ length: 24 }).map((_, hour) => <MenuItem key={`end-${hour}`} value={hour}>{`${hour.toString().padStart(2, "0")}:00`}</MenuItem>)}
                </TextField>
              </Stack>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
