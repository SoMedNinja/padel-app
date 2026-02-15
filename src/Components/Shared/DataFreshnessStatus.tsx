import { Alert, Typography } from "@mui/material";

interface DataFreshnessStatusProps {
  isFetching: boolean;
  hasCachedData: boolean;
  hasError: boolean;
  lastUpdatedAt?: number;
}

const formatLastUpdated = (timestamp?: number) => {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
};

export default function DataFreshnessStatus({
  isFetching,
  hasCachedData,
  hasError,
  lastUpdatedAt,
}: DataFreshnessStatusProps) {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  const lastUpdated = formatLastUpdated(lastUpdatedAt);

  if (isFetching) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        {/* Note for non-coders: this means we are checking the server now, while still showing existing data on screen. */}
        <Typography variant="body2">Synkar data… du ser senaste kända version under tiden.</Typography>
      </Alert>
    );
  }

  if ((isOffline || hasError) && hasCachedData) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        {/* Note for non-coders: "cache" means saved copy on this device, so numbers can be slightly old until internet comes back. */}
        <Typography variant="body2">
          Visar sparad offline-data{lastUpdated ? ` från kl ${lastUpdated}` : ""}. Anslut till internet och dra ned för att uppdatera.
        </Typography>
      </Alert>
    );
  }

  if (hasCachedData && lastUpdated) {
    return (
      <Alert severity="success" sx={{ mb: 2 }}>
        {/* Note for non-coders: this confirms data was recently verified online and is considered fresh. */}
        <Typography variant="body2">Data är uppdaterad (senast kontrollerad kl {lastUpdated}).</Typography>
      </Alert>
    );
  }

  return null;
}
