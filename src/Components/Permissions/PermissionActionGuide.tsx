import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Drawer, LinearProgress, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare";
import AddBoxOutlinedIcon from "@mui/icons-material/AddBoxOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  buildWebPermissionSnapshots,
  detectStandaloneInstallState,
  ensureNotificationPermission,
  loadNotificationPreferences,
  registerPushServiceWorker,
} from "../../services/webNotificationService";
import { IOS_PERMISSION_LIMITATIONS_COPY } from "../../shared/permissionsCopy";
import { getInstallGuidanceContext, INSTALL_GUIDANCE_COPY } from "../../shared/installGuidance";
import {
  loadPermissionGuideMetrics,
  PermissionGuideEntryPoint,
  recordInstallCtaEvent,
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

export default function PermissionActionGuide() {
  const [open, setOpen] = useState(false);
  const [entryPoint, setEntryPoint] = useState<PermissionGuideEntryPoint>("settings");
  const [snapshots, setSnapshots] = useState<PermissionStatusSnapshot[]>([]);
  const [isInstalled, setIsInstalled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState(() => loadPermissionGuideMetrics());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const installGuidanceContext = useMemo(() => getInstallGuidanceContext(), []);

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
    const isIosSafari = installGuidanceContext.platformIntent === "ios_safari";

    return [
      {
        key: "install",
        title: INSTALL_GUIDANCE_COPY.permissionGuideInstallLabel,
        helpText: installGuidanceContext.installHelpText,
        done: isInstalled,
      },
      {
        key: "notifications",
        title: "Tillåt notiser",
        helpText: isIosSafari ? IOS_PERMISSION_LIMITATIONS_COPY.notifications : notificationSnapshot?.detail ?? "Tillåt notiser i webbläsaren.",
        done: notificationSnapshot?.state === "allowed",
      },
      {
        key: "background_refresh",
        title: "Verifiera bakgrundsuppdatering",
        helpText: isIosSafari ? IOS_PERMISSION_LIMITATIONS_COPY.backgroundRefresh : backgroundSnapshot?.detail ?? "Håll bakgrundsuppdatering redo.",
        done: backgroundSnapshot?.state === "allowed",
      },
    ];
  }, [installGuidanceContext.installHelpText, installGuidanceContext.platformIntent, isInstalled, snapshots]);

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
      recordInstallCtaEvent({
        surface: "permission_guide",
        cta: "run_install_step",
        promptType: installGuidanceContext.platformIntent === "ios_safari" ? "ios_manual" : "browser_prompt",
        platformIntent: installGuidanceContext.platformIntent,
        entryPoint,
      });
      setMessage("Installationssteget kräver manuell åtgärd i webbläsaren eller iOS-menyerna. Följ stegen och tryck sedan på uppdatera status.");
    }

    if (activeStep.key === "notifications") {
      await ensureNotificationPermission();
      setMessage("Notisbehörigheten kontrollerades igen.");
    }

    if (activeStep.key === "background_refresh") {
      await registerPushServiceWorker(loadNotificationPreferences());
      setMessage("Bakgrundsuppdateringen testades igen via registrering av service worker.");
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

  const renderGuideContent = () => {
    const isIosSafari = installGuidanceContext.platformIntent === "ios_safari";

    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          {/* Note for non-coders: this explains that we show one next-best action at a time instead of a long technical list. */}
          Öppnad från: {entryPoint}. Vi visar ett steg i taget så att inställningen blir enkel att följa.
        </Typography>

        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Framsteg</Typography>
            <Chip label={`${completedCount}/${steps.length}`} size="small" color={completedCount === steps.length ? "success" : "primary"} />
          </Stack>
          <LinearProgress variant="determinate" value={completionRatio} />
        </Box>

        <Alert severity={activeStep.done ? "success" : "info"}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{activeStep.title}</Typography>
          {activeStep.key === "install" && isIosSafari && !activeStep.done ? (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {INSTALL_GUIDANCE_COPY.iosManualIntro}
              </Typography>
              <Box component="ol" sx={{ pl: 2.5, mb: 1.5 }}>
                <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
                  {INSTALL_GUIDANCE_COPY.iosManualSteps[0]} <IosShareIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
                </Typography>
                <Typography component="li" variant="body2" sx={{ display: "list-item" }}>
                  {INSTALL_GUIDANCE_COPY.iosManualSteps[1]} <AddBoxOutlinedIcon sx={{ fontSize: 16, verticalAlign: "text-bottom" }} />.
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1,
                  py: 0.75,
                  borderRadius: 1,
                  border: "1px dashed",
                  borderColor: "info.main",
                  bgcolor: "background.paper"
                }}
              >
                <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>
                  Mini-guide:
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <IosShareIcon sx={{ fontSize: 18 }} />
                  <ArrowForwardIcon sx={{ fontSize: 14, opacity: 0.7 }} />
                  <AddBoxOutlinedIcon sx={{ fontSize: 18 }} />
                </Stack>
              </Box>
            </Box>
          ) : (
            <Typography variant="body2">{activeStep.helpText}</Typography>
          )}
        </Alert>

        <Typography variant="caption" color="text.secondary">
          Slutförandeanalys (lokalt): installation {metrics.install.completions}/{metrics.install.attempts}, notiser {metrics.notifications.completions}/{metrics.notifications.attempts}, bakgrund {metrics.background_refresh.completions}/{metrics.background_refresh.attempts}
        </Typography>

        {message ? <Alert severity="info">{message}</Alert> : null}
      </Stack>
    );
  };

  const renderGuideActions = () => (
    <>
      <Button onClick={() => void refreshState()}>Uppdatera status</Button>
      <Button variant="contained" onClick={() => void runStepAction()}>
        {activeStep.done ? "Klart" : "Gör detta steg"}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            p: 2,
            maxHeight: "85vh" // Prevents it from taking up too much height on small screens
          }
        }}
      >
        <Typography variant="h6" sx={{ mb: 2 }}>Guide för behörighetsinställning</Typography>
        {renderGuideContent()}
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
          {renderGuideActions()}
        </Stack>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
      <DialogTitle>Guide för behörighetsinställning</DialogTitle>
      <DialogContent>
        {renderGuideContent()}
      </DialogContent>
      <DialogActions>
        {renderGuideActions()}
      </DialogActions>
    </Dialog>
  );
}
