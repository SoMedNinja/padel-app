import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, Typography } from "@mui/material";
import { getCurrentWebAppVersion } from "../services/appVersionService";
import {
  getLastSeenHighlightsVersion,
  loadReleaseHighlights,
  markHighlightsVersionAsSeen,
  resolveCurrentRelease,
  type ReleaseHighlight,
} from "../services/releaseHighlightsService";

// Export the component with optional props to allow manual control
export interface WhatsNewDialogProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function WhatsNewDialog({ forceOpen = false, onClose }: WhatsNewDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [release, setRelease] = useState<ReleaseHighlight | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const payload = await loadReleaseHighlights();
      // If forced open (e.g. from settings), we just show the current version's highlights
      // irrespective of "last seen" status.
      if (forceOpen) {
        const currentVersion = getCurrentWebAppVersion();
        // Find the release matching current version, or fallback to the first one
        const targetRelease = payload?.releases?.find((r) => r.version === currentVersion) ?? payload?.releases?.[0];

        if (isMounted && targetRelease) {
          setRelease(targetRelease);
          setIsOpen(true);
        }
        return;
      }

      const lastSeenVersion = getLastSeenHighlightsVersion();
      const currentRelease = resolveCurrentRelease(payload, getCurrentWebAppVersion(), lastSeenVersion);
      if (!isMounted || !currentRelease) return;

      if (currentRelease.shouldStoreAsSeenWithoutDialog) {
        markHighlightsVersionAsSeen(currentRelease.appVersion);
        return;
      }

      if (!currentRelease.shouldShowDialog) return;

      setRelease(currentRelease.release);
      setAppVersion(currentRelease.appVersion);
      setIsOpen(true);
    })();

    return () => {
      isMounted = false;
    };
  }, [forceOpen]);

  const handleClose = () => {
    if (!forceOpen && appVersion) {
      // Note for non-coders: saving this version means we won't show this same message again until the next app update.
      markHighlightsVersionAsSeen(appVersion);
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!release) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{release.title}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Här är de viktigaste nyheterna i den här versionen.
        </Typography>
        <List dense sx={{ listStyleType: "disc", pl: 2 }}>
          {release.changes.map((change) => (
            <ListItem key={change} sx={{ display: "list-item", py: 0.5 }}>
              {change}
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="contained" autoFocus>
          Okej
        </Button>
      </DialogActions>
    </Dialog>
  );
}
