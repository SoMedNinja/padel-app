import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { buildWebPermissionSnapshots, ensureNotificationPermission } from "../../services/webNotificationService";
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

export default function WebPermissionsPanel({ onNotificationPermissionChanged }: WebPermissionsPanelProps) {
  const [snapshots, setSnapshots] = useState<PermissionStatusSnapshot[]>([]);

  const reloadSnapshots = async () => {
    const data = await buildWebPermissionSnapshots();
    setSnapshots(data);
  };

  useEffect(() => {
    void reloadSnapshots();
  }, []);

  const handleAction = async (snapshot: PermissionStatusSnapshot) => {
    if (snapshot.capability === "notifications") {
      await ensureNotificationPermission();
      await onNotificationPermissionChanged();
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

      <Alert severity="info" sx={{ mt: 2 }}>
        {SHARED_PERMISSION_PLATFORM_DIFFERENCES}
      </Alert>
    </Box>
  );
}
