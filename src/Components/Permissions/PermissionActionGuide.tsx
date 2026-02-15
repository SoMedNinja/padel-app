import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from "@mui/material";
import {
  buildWebPermissionSnapshots,
  detectStandaloneInstallState,
  ensureNotificationPermission,
  loadNotificationPreferences,
  registerPushServiceWorker,
} from "../../services/webNotificationService";
import { IOS_PERMISSION_LIMITATIONS_COPY } from "../../shared/permissionsCopy";
import {
  loadPermissionGuideMetrics,
  PermissionGuideEntryPoint,
  recordPermissionGuideMetric,
  subscribePermissionGuideOpen,
} from "../../services/permissionGuidanceService";
import { PermissionStatusSnapshot } from "../../types/permissions";

type GuideStepKey = "install" | "notifications" | "background_refresh";

type GuideStep = {
  key: GuideStepKey;
  title: string;
  helpText: string;
  done: boolean;
};

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PermissionActionGuide() {
  const [open, setOpen] = useState(false);
  const [entryPoint, setEntryPoint] = useState<PermissionGuideEntryPoint>("settings");
  const [snapshots, setSnapshots] = useState<PermissionStatusSnapshot[]>([]);
  const [isInstalled, setIsInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(() => loadPermissionGuideMetrics());

  const refreshState = async () => {
    const data = await buildWebPermissionSnapshots();
    setSnapshots(data);
    setIsInstalled(detectStandaloneInstallState());
  };

  useEffect(() => {
    void refreshState();

    return subscribePermissionGuideOpen((payload) => {
      setEntryPoint(payload.source);
      setOpen(true);
      void refreshState();
    });
  }, []);

  const steps = useMemo<GuideStep[]>(() => {
    const notificationSnapshot = snapshots.find((snapshot) => snapshot.capability === "notifications");
    const backgroundSnapshot = snapshots.find((snapshot) => snapshot.capability === "background_refresh");
    const ios = isIosDevice();

    return [
      {
        key: "install",
        title: "Install app to Home Screen",
        helpText: ios
          ? "Open Safari Share menu and choose 'Add to Home Screen' so push and background behavior work more reliably."
          : "Install the app from your browser menu so it behaves more like a native app.",
        done: isInstalled,
      },
      {
        key: "notifications",
        title: "Allow notifications",
        helpText: ios ? IOS_PERMISSION_LIMITATIONS_COPY.notifications : notificationSnapshot?.detail ?? "Enable browser notifications.",
        done: notificationSnapshot?.state === "allowed",
      },
      {
        key: "background_refresh",
        title: "Verify background refresh",
        helpText: ios ? IOS_PERMISSION_LIMITATIONS_COPY.backgroundRefresh : backgroundSnapshot?.detail ?? "Keep background refresh ready.",
        done: backgroundSnapshot?.state === "allowed",
      },
    ];
  }, [isInstalled, snapshots]);

  const activeStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];
  const completedCount = steps.filter((step) => step.done).length;
  const completionRatio = Math.round((completedCount / steps.length) * 100);

  const maybeRecordCompletion = (before: GuideStep[], after: GuideStep[]) => {
    before.forEach((step) => {
      const nextStep = after.find((candidate) => candidate.key === step.key);
      if (!step.done && nextStep?.done) {
        setMetrics(recordPermissionGuideMetric(step.key, "completion"));
      }
    });
  };

  const runStepAction = async () => {
    setMetrics(recordPermissionGuideMetric(activeStep.key, "attempt"));
    const before = steps;

    if (activeStep.key === "install") {
      setMessage("Install step requires manual action in browser/iOS menus. Follow the instructions and then press refresh status.");
    }

    if (activeStep.key === "notifications") {
      await ensureNotificationPermission();
      setMessage("Notification permission was checked again.");
    }

    if (activeStep.key === "background_refresh") {
      await registerPushServiceWorker(loadNotificationPreferences());
      setMessage("Background refresh setup was retried via service worker registration.");
    }

    const afterSnapshots = await buildWebPermissionSnapshots();
    setSnapshots(afterSnapshots);
    setIsInstalled(detectStandaloneInstallState());
    const after: GuideStep[] = [
      { key: "install", title: "", helpText: "", done: detectStandaloneInstallState() },
      { key: "notifications", title: "", helpText: "", done: afterSnapshots.some((item) => item.capability === "notifications" && item.state === "allowed") },
      { key: "background_refresh", title: "", helpText: "", done: afterSnapshots.some((item) => item.capability === "background_refresh" && item.state === "allowed") },
    ];

    maybeRecordCompletion(before, after);
  };

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Permission setup guide</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {/* Note for non-coders: this explains that we show one next-best action at a time instead of a long technical list. */}
            Opened from: {entryPoint}. We guide one action at a time so setup feels simple.
          </Typography>

          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">Progress</Typography>
              <Chip label={`${completedCount}/${steps.length}`} size="small" color={completedCount === steps.length ? "success" : "primary"} />
            </Stack>
            <LinearProgress variant="determinate" value={completionRatio} />
          </Box>

          <Alert severity={activeStep.done ? "success" : "info"}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeStep.title}</Typography>
            <Typography variant="body2">{activeStep.helpText}</Typography>
          </Alert>

          <Typography variant="caption" color="text.secondary">
            Completion analytics (local): install {metrics.install.completions}/{metrics.install.attempts}, notifications {metrics.notifications.completions}/{metrics.notifications.attempts}, background {metrics.background_refresh.completions}/{metrics.background_refresh.attempts}
          </Typography>

          {message ? <Alert severity="info">{message}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => void refreshState()}>Refresh status</Button>
        <Button variant="contained" onClick={() => void runStepAction()}>
          {activeStep.done ? "Done" : "Do this step"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
