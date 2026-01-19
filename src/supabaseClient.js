import { createClient } from "@supabase/supabase-js";

// Prefer env values, but fall back to defaults so local dev works out of the box.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://hiasgpbuqhiwutpgugjk.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_HmVbNlWyuBw6PFEJCtmTUg_EQG25c3F";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
