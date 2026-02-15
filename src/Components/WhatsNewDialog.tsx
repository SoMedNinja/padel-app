import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, Typography } from "@mui/material";
import {
  findCurrentRelease,
  getLastSeenHighlightsVersion,
  loadReleaseHighlights,
  markHighlightsVersionAsSeen,
  type ReleaseHighlight,
} from "../services/releaseHighlightsService";

export default function WhatsNewDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [release, setRelease] = useState<ReleaseHighlight | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const payload = await loadReleaseHighlights();
      const currentRelease = findCurrentRelease(payload);
      if (!isMounted || !currentRelease) return;

      const lastSeenVersion = getLastSeenHighlightsVersion();
      if (lastSeenVersion === currentRelease.appVersion) return;

      setRelease(currentRelease.release);
      setAppVersion(currentRelease.appVersion);
      setIsOpen(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleClose = () => {
    if (appVersion) {
      // Note for non-coders: saving this version means we won't show this same message again until the next app update.
      markHighlightsVersionAsSeen(appVersion);
    }
    setIsOpen(false);
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
