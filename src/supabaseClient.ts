import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Prefer env values so each environment can point at its own database.
const envSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = envSupabaseUrl || "";
const supabaseAnonKey = envSupabaseAnonKey || "";
const isPublishableKey = supabaseAnonKey.startsWith("sb_publishable_");

if (isPublishableKey) {
  // Note for non-coders: Supabase "publishable" keys won't authenticate Edge Functions, so we warn loudly.
  console.warn(
    "Warning: VITE_SUPABASE_ANON_KEY is a publishable key (sb_publishable_*). It must be the anon public key; publishable keys cause 401 errors for Edge Functions. Admin note: find the anon public key in Supabase Dashboard → Project Settings → API → Project API keys."
  );
}

const isSupabaseConfigured = Boolean(envSupabaseUrl && envSupabaseAnonKey);
const missingSupabaseMessage =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.";

if (typeof envSupabaseAnonKey === "string" && envSupabaseAnonKey.startsWith("sb_publishable_")) {
  // Note for non-coders: the publishable key is not accepted by Edge Functions; use the anon public key from Supabase.
  console.warn(
    "VITE_SUPABASE_ANON_KEY looks like a publishable key. Edge Functions require the anon public key from Supabase -> Project Settings -> API."
  );
}

const createMockQuery = (): any => {
  const response = { data: [], error: null };
  return {
    select: () => createMockQuery(),
    insert: () => createMockQuery(),
    update: () => createMockQuery(),
    upsert: () => createMockQuery(),
    delete: () => createMockQuery(),
    eq: () => createMockQuery(),
    lt: () => createMockQuery(),
    lte: () => createMockQuery(),
    or: () => createMockQuery(),
    order: () => createMockQuery(),
    limit: () => createMockQuery(),
    single: () => createMockQuery(),
    filter: () => createMockQuery(),
    not: () => createMockQuery(),
    then: (onFulfilled: any, onRejected: any) => Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected: any) => Promise.resolve(response).catch(onRejected),
    finally: (onFinally: any) => Promise.resolve(response).finally(onFinally),
  };
};

const createMockSupabase = (): any => ({
  // Note for non-coders: this mock makes missing setup obvious without crashing the whole app.
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signUp: () => Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
    resetPasswordForEmail: () => Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
    signOut: () => Promise.resolve({ error: new Error(missingSupabaseMessage) }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
  },
  from: () => createMockQuery(),
  channel: () => {
    const channel: any = {
      on: () => channel,
      subscribe: () => channel,
    };
    return channel;
  },
  removeChannel: () => {},
});

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createMockSupabase() as unknown as SupabaseClient);

export { isSupabaseConfigured };
