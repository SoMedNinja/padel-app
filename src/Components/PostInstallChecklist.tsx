import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import {
  buildWebPermissionSnapshots,
} from "../services/webNotificationService";

type ChecklistProgress = {
  notifications: boolean;
  backgroundRefresh: boolean;
  accountSignIn: boolean;
};

interface PostInstallChecklistProps {
  isStandalone: boolean;
  isSignedIn: boolean;
}

const STORAGE_VERSION = "v1";
const STORAGE_KEY = `padel:post-install-checklist:${STORAGE_VERSION}`;
const DISMISS_KEY = `padel:post-install-checklist:dismissed:${STORAGE_VERSION}`;

const EMPTY_PROGRESS: ChecklistProgress = {
  notifications: false,
  backgroundRefresh: false,
  accountSignIn: false,
};

function loadStoredProgress(): ChecklistProgress {
  if (typeof window === "undefined") return EMPTY_PROGRESS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_PROGRESS;

    const parsed = JSON.parse(raw) as Partial<ChecklistProgress>;
    return {
      notifications: Boolean(parsed.notifications),
      backgroundRefresh: Boolean(parsed.backgroundRefresh),
      accountSignIn: Boolean(parsed.accountSignIn),
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function saveStoredProgress(progress: ChecklistProgress): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function PostInstallChecklist({ isStandalone, isSignedIn }: PostInstallChecklistProps) {
  const [progress, setProgress] = React.useState<ChecklistProgress>(() => loadStoredProgress());
  const [dismissed, setDismissed] = React.useState(false);
  const [isLoadingCapabilities, setIsLoadingCapabilities] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    // Note for non-coders:
    // We remember if the user dismissed this card so we don't keep nagging on every app open.
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "true");
  }, []);

  React.useEffect(() => {
    if (!isStandalone) return;

    let cancelled = false;

    const syncChecklistProgress = async () => {
      setIsLoadingCapabilities(true);
      const snapshots = await buildWebPermissionSnapshots();
      if (cancelled) return;

      const notificationsReady = snapshots.some(
        snapshot => snapshot.capability === "notifications" && snapshot.state === "allowed"
      );
      const backgroundRefreshReady = snapshots.some(
        snapshot => snapshot.capability === "background_refresh" && snapshot.state === "allowed"
      );

      // Note for non-coders:
      // We keep each completed step "sticky" so users don't lose progress if a browser check flakes once.
      setProgress((previous) => {
        const nextProgress = {
          notifications: previous.notifications || notificationsReady,
          backgroundRefresh: previous.backgroundRefresh || backgroundRefreshReady,
          accountSignIn: previous.accountSignIn || isSignedIn,
        };
        saveStoredProgress(nextProgress);
        return nextProgress;
      });

      setIsLoadingCapabilities(false);
    };

    void syncChecklistProgress();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, isStandalone]);

  if (!isStandalone) return null;
  if (dismissed) return null;

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalSteps = 3;
  const allCompleted = completedCount === totalSteps;

  const checklistItems = [
    {
      key: "notifications",
      title: "Aktivera notiser",
      helpText: "Tryck på 'Aktivera notiser nu' och välj sedan Tillåt i webbläsarens notisruta.",
      done: progress.notifications,
    },
    {
      key: "backgroundRefresh",
      title: "Verifiera bakgrundsuppdatering",
      helpText: "Håll bakgrundsuppdatering redo så appen kan synka i bakgrunden när det är möjligt.",
      done: progress.backgroundRefresh,
    },
    {
      key: "accountSignIn",
      title: "Bekräfta inloggning",
      helpText: "Var inloggad så att historik och inställningar sparas på alla dina enheter.",
      done: progress.accountSignIn,
    },
  ] as const;

  const handleDismissChecklist = () => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  const handleRequestNotifications = async () => {
    setIsLoadingCapabilities(true);
    try {
      const snapshots = await buildWebPermissionSnapshots();
      const notificationsReady = snapshots.some(
        snapshot => snapshot.capability === "notifications" && snapshot.state === "allowed"
      );

      // Note for non-coders:
      // This opens the browser's own permission popup, which is the only place users can approve notifications.
      if (!notificationsReady && typeof window !== "undefined" && "Notification" in window) {
        await window.Notification.requestPermission();
      }

      const nextSnapshots = await buildWebPermissionSnapshots();
      const notificationsDone = nextSnapshots.some(
        snapshot => snapshot.capability === "notifications" && snapshot.state === "allowed"
      );
      const backgroundRefreshReady = nextSnapshots.some(
        snapshot => snapshot.capability === "background_refresh" && snapshot.state === "allowed"
      );

      setProgress((previous) => {
        const nextProgress = {
          notifications: previous.notifications || notificationsDone,
          backgroundRefresh: previous.backgroundRefresh || backgroundRefreshReady,
          accountSignIn: previous.accountSignIn || isSignedIn,
        };
        saveStoredProgress(nextProgress);
        return nextProgress;
      });
    } finally {
      setIsLoadingCapabilities(false);
    }
  };

  return (
    <Alert
      severity={allCompleted ? "success" : "info"}
      sx={{ borderRadius: 2 }}
      icon={false}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <AlertTitle sx={{ mb: 0 }}>Checklista för app-lik konfiguration</AlertTitle>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Chip
              size="small"
              color={allCompleted ? "success" : "primary"}
              label={`${completedCount}/${totalSteps} klara`}
            />
            <IconButton
              size="small"
              onClick={handleDismissChecklist}
              aria-label="Dölj checklistan"
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Slutför dessa snabba steg en gång för att få den bästa app-lika upplevelsen.
        </Typography>

        {!progress.notifications && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" size="small" onClick={() => void handleRequestNotifications()}>
              Aktivera notiser nu
            </Button>
            <Button variant="text" size="small" onClick={handleDismissChecklist}>
              Visa inte detta igen
            </Button>
          </Stack>
        )}

        {isLoadingCapabilities && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Kontrollerar enhetsstöd...
            </Typography>
          </Box>
        )}

        <List dense disablePadding>
          {checklistItems.map((item) => (
            <ListItem key={item.key} disableGutters sx={{ alignItems: "flex-start", py: 0.75 }}>
              <Box sx={{ pt: 0.25, mr: 1 }}>
                {item.done ? (
                  <CheckCircleIcon color="success" fontSize="small" />
                ) : (
                  <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                )}
              </Box>
              <ListItemText
                primary={item.title}
                secondary={item.helpText}
                slotProps={{
                  primary: { variant: "body2", sx: { fontWeight: 600 } },
                  secondary: { variant: "caption" },
                }}
              />
            </ListItem>
          ))}
        </List>
      </Stack>
    </Alert>
  );
}
