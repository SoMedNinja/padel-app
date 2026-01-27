import { Link } from "@mui/material";
import { isSupabaseConfigured } from "../supabaseClient";
import AppAlert from "./Shared/AppAlert";

export default function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;
  // Note for non-coders: this banner explains missing server settings so setup issues are easier to spot.
  return (
    <AppAlert severity="warning" title="Supabase är inte konfigurerat" sx={{ mb: 2 }}>
      Lägg till <strong>VITE_SUPABASE_URL</strong> och <strong>VITE_SUPABASE_ANON_KEY</strong> i din miljö.
      Se guiden i <Link href="https://supabase.com/docs" target="_blank" rel="noreferrer">Supabase-dokumentationen</Link>.
    </AppAlert>
  );
}
