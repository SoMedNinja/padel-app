import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://hiasgpbuqhiwutpgugjk.supabase.co"
const supabaseAnonKey = "sb_publishable_HmVbNlWyuBw6PFEJCtmTUg_EQG25c3F"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
