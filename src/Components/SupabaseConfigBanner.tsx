import { Link } from "@mui/material";
import { isSupabaseConfigured, supabaseConfigWarning } from "../supabaseClient";
import AppAlert from "./Shared/AppAlert";

export default function SupabaseConfigBanner() {
  if (isSupabaseConfigured) return null;
  // Note for non-coders: this banner explains exactly what setup value is wrong,
  // so "invalid email/password" errors do not hide a backend configuration issue.
  return (
    <AppAlert severity="warning" title="Supabase är inte korrekt konfigurerat" sx={{ mb: 2 }}>
      {supabaseConfigWarning || "Lägg till VITE_SUPABASE_URL och VITE_SUPABASE_ANON_KEY i din miljö."}{" "}
      Se guiden i <Link href="https://supabase.com/docs" target="_blank" rel="noreferrer">Supabase-dokumentationen</Link>.
    </AppAlert>
  );
}
