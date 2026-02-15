import { Button, Paper, Stack, Typography } from "@mui/material";
import { UPDATE_STATE_CONTENT, UpdateUrgency } from "../../shared/updateStates";

type AppUpdateBannerProps = {
  open: boolean;
  urgency: UpdateUrgency;
  onUpdateNow: () => void;
  onLater: () => void;
};

export default function AppUpdateBanner({ open, urgency, onUpdateNow, onLater }: AppUpdateBannerProps) {
  if (!open) return null;

  const content = UPDATE_STATE_CONTENT[urgency];

  return (
    <Paper
      elevation={8}
      role="status"
      sx={(theme) => ({
        position: "fixed",
        left: theme.spacing(2),
        right: theme.spacing(2),
        bottom: theme.spacing(2),
        zIndex: theme.zIndex.snackbar,
        p: 2,
        borderRadius: 2,
      })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
        <div>
          <Typography variant="subtitle1" fontWeight={700}>
            {content.title}
          </Typography>
          {/* Note for non-coders: this explains that pressing update reloads once so the newest app files are used. */}
          <Typography variant="body2" color="text.secondary">
            {content.message}
          </Typography>
        </div>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          {content.secondaryActionLabel ? (
            <Button onClick={onLater} color="inherit">
              {content.secondaryActionLabel}
            </Button>
          ) : null}
          <Button onClick={onUpdateNow} variant="contained">
            {content.primaryActionLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
