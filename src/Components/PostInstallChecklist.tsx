import React from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
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
  const [isLoadingCapabilities, setIsLoadingCapabilities] = React.useState(false);

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

  const completedCount = Object.values(progress).filter(Boolean).length;
  const totalSteps = 3;
  const allCompleted = completedCount === totalSteps;

  const checklistItems = [
    {
      key: "notifications",
      title: "Enable notifications",
      helpText: "Allow notifications so match reminders and score updates can reach you instantly.",
      done: progress.notifications,
    },
    {
      key: "backgroundRefresh",
      title: "Verify background refresh",
      helpText: "Keep background refresh ready so the app can sync in the background when possible.",
      done: progress.backgroundRefresh,
    },
    {
      key: "accountSignIn",
      title: "Confirm account sign-in",
      helpText: "Stay signed in so your history and settings are saved on all your devices.",
      done: progress.accountSignIn,
    },
  ] as const;

  return (
    <Alert
      severity={allCompleted ? "success" : "info"}
      sx={{ borderRadius: 2 }}
      icon={false}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <AlertTitle sx={{ mb: 0 }}>Native-like setup checklist</AlertTitle>
          <Chip
            size="small"
            color={allCompleted ? "success" : "primary"}
            label={`${completedCount}/${totalSteps} complete`}
          />
        </Box>

        <Typography variant="body2" color="text.secondary">
          Complete these quick steps once to unlock the best app-like experience.
        </Typography>

        {isLoadingCapabilities && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">
              Checking device readiness...
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
