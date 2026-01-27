import { Alert, AlertTitle, Link } from "@mui/material";
import { isSupabaseConfigured } from "../supabaseClient";

export default function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;
  // Note for non-coders: this banner explains missing server settings so setup issues are easier to spot.
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>Supabase är inte konfigurerat</AlertTitle>
      Lägg till <strong>VITE_SUPABASE_URL</strong> och <strong>VITE_SUPABASE_ANON_KEY</strong> i din miljö.
      Se guiden i <Link href="https://supabase.com/docs" target="_blank" rel="noreferrer">Supabase-dokumentationen</Link>.
    </Alert>
  );
}
