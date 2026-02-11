import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Prefer env values so each environment can point at its own database.
const envSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = envSupabaseUrl || "";
const supabaseAnonKey = envSupabaseAnonKey || "";
const isPublishableKey = supabaseAnonKey.startsWith("sb_publishable_");

const supabaseConfigWarning = !envSupabaseUrl || !envSupabaseAnonKey
  ? "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment."
  : isPublishableKey
    ? "VITE_SUPABASE_ANON_KEY uses sb_publishable_*. Use the Supabase anon public key from Project Settings -> API -> Project API keys."
    : null;

if (isPublishableKey) {
  // Note for non-coders: this key family often causes auth confusion and 401-style failures in app features.
  console.warn(
    "Warning: VITE_SUPABASE_ANON_KEY is sb_publishable_*. Replace it with the anon public key from Supabase Dashboard -> Project Settings -> API."
  );
}

const isSupabaseConfigured = !supabaseConfigWarning;
const missingSupabaseMessage = supabaseConfigWarning
  || "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.";

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
  // Note for non-coders: this mock makes configuration mistakes obvious without crashing the whole app.
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
    refreshSession: () => Promise.resolve({ data: { session: null }, error: new Error(missingSupabaseMessage) }),
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

export { isSupabaseConfigured, supabaseAnonKey, supabaseUrl, supabaseConfigWarning };
