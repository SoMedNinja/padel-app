import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Prefer env values so each environment can point at its own database.
const envSupabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const envSupabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
const supabaseUrl = envSupabaseUrl || "";
const supabaseAnonKey = envSupabaseAnonKey || "";

const supabaseConfigWarning = !envSupabaseUrl || !envSupabaseAnonKey
  ? "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment."
  : null;

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


// Note for non-coders: this guard verifies that we at least have a public app key before calling Edge Functions.
// Supabase currently supports both legacy anon keys and newer sb_publishable_* keys for browser clients.
export const assertEdgeFunctionAnonKey = () => {
  if (!supabaseAnonKey) {
    throw new Error(
      "Miljöfel: VITE_SUPABASE_ANON_KEY saknas. Lägg in Supabase public app key (anon key eller sb_publishable_*) i miljövariablerna.",
    );
  }
};

// Note for non-coders: Edge Functions need both keys below so Supabase can verify
// who is calling and which project/app key is being used.
export const buildEdgeFunctionAuthHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
  apikey: supabaseAnonKey,
});

export { isSupabaseConfigured, supabaseAnonKey, supabaseUrl, supabaseConfigWarning };
