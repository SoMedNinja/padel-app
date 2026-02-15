import { Button, Paper, Stack, Typography } from "@mui/material";

type AppUpdateBannerProps = {
  open: boolean;
  onUpdateNow: () => void;
  onLater: () => void;
};

export default function AppUpdateBanner({ open, onUpdateNow, onLater }: AppUpdateBannerProps) {
  if (!open) return null;

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
            App update available
          </Typography>
          {/* Note for non-coders: this explains that pressing update reloads once so the newest app files are used. */}
          <Typography variant="body2" color="text.secondary">
            A new version is ready. Update now to load the latest fixes.
          </Typography>
        </div>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onLater} color="inherit">
            Later
          </Button>
          <Button onClick={onUpdateNow} variant="contained">
            Update now
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
