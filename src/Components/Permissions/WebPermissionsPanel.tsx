import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import {
  buildWebPermissionSnapshots,
  ensureNotificationPermission,
  loadNotificationPreferences,
  registerPushServiceWorker,
} from "../../services/webNotificationService";
import { SHARED_PERMISSION_CAPABILITY_LABELS, SHARED_PERMISSION_STATE_LABELS, WEB_PERMISSION_CAPABILITY_HELP } from "../../shared/permissionsCopy";
import { SHARED_PERMISSION_PLATFORM_DIFFERENCES } from "../../shared/permissionCapabilityMatrix";
import { PermissionStatusSnapshot } from "../../types/permissions";

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
    return "Open iOS Settings > Notifications > this app, then allow notifications. If using Safari, add this app to Home Screen first.";
  }
  if (/firefox/.test(ua)) {
    return "Open Firefox Site Settings, find Notifications for this site, and switch to Allow.";
  }
  if (/edg\//.test(ua) || /edgios/.test(ua)) {
    return "Open Edge site permissions, set Notifications to Allow, then refresh this page.";
  }
  return "Open your browser's site settings for this page and set Notifications to Allow, then refresh.";
}

export default function WebPermissionsPanel({ onNotificationPermissionChanged }: WebPermissionsPanelProps) {
  const [snapshots, setSnapshots] = useState<PermissionStatusSnapshot[]>([]);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const reloadSnapshots = async () => {
    const data = await buildWebPermissionSnapshots();
    setSnapshots(data);
  };

  useEffect(() => {
    void reloadSnapshots();
  }, []);

  const handleNotificationsAction = async (snapshot: PermissionStatusSnapshot) => {
    if (snapshot.state === "blocked" || snapshot.state === "limited") {
      setActionMessage(notificationSettingsGuidance());
      return;
    }

    await ensureNotificationPermission();
    await onNotificationPermissionChanged();
    setActionMessage("Notification check retried. If permission is granted, push setup will complete automatically.");
  };

  const handleBackgroundRefreshAction = async () => {
    if (!("serviceWorker" in navigator)) {
      setActionMessage("This browser does not support service workers, so background refresh cannot be enabled here.");
      return;
    }

    const existingRegistration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!existingRegistration) {
      await registerPushServiceWorker(loadNotificationPreferences());
      setActionMessage("Service worker install was retried. Keep this tab open for a few seconds, then retry check.");
      return;
    }

    await existingRegistration.update();
    if (!existingRegistration.active) {
      setActionMessage("Service worker exists but is not active yet. Reload the app (or reinstall PWA on iOS) and retry.");
      return;
    }

    setActionMessage("Background refresh check retried. Service worker is active.");
  };

  const handlePasskeyAction = async () => {
    if (!("PublicKeyCredential" in window)) {
      setActionMessage("This browser does not expose WebAuthn APIs, so platform passkeys are unavailable.");
      return;
    }

    const hasPlatformAuthenticator =
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
        ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : false;

    setActionMessage(
      hasPlatformAuthenticator
        ? "Platform authenticator detected. You can continue with passkey setup on this device."
        : "WebAuthn is present, but no platform authenticator is currently available. Check device lock-screen/biometrics settings."
    );
  };

  const handleAction = async (snapshot: PermissionStatusSnapshot) => {
    if (snapshot.capability === "notifications") {
      await handleNotificationsAction(snapshot);
    } else if (snapshot.capability === "background_refresh") {
      await handleBackgroundRefreshAction();
    } else if (snapshot.capability === "biometric_passkey") {
      await handlePasskeyAction();
    }

    await reloadSnapshots();
  };

  return (
    <Box sx={{ p: 2, border: "1px solid", borderColor: "divider", borderRadius: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Centralized permissions panel</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {/* Note for non-coders: this panel translates technical browser APIs into the same state words used on iOS. */}
        Same state model on every client: Allowed, Blocked, Limited, or Action needed.
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
    </Box>
  );
}
