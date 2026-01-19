import { createClient } from "@supabase/supabase-js";

// Prefer env values, but fall back to defaults so local dev works out of the box.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://hiasgpbuqhiwutpgugjk.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_HmVbNlWyuBw6PFEJCtmTUg_EQG25c3F";

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const missingSupabaseMessage =
  "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment.";

const createMockQuery = () => {
  const response = { data: null, error: new Error(missingSupabaseMessage) };
  return {
    select: () => createMockQuery(),
    insert: () => createMockQuery(),
    update: () => createMockQuery(),
    delete: () => createMockQuery(),
    eq: () => createMockQuery(),
    order: () => createMockQuery(),
    single: () => createMockQuery(),
    then: (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(response).catch(onRejected),
    finally: (onFinally) => Promise.resolve(response).finally(onFinally),
  };
};

const createMockSupabase = () => ({
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: new Error(missingSupabaseMessage) }),
    onAuthStateChange: () => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signUp: () => Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
    signInWithPassword: () => Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
    signOut: () => Promise.resolve({ error: new Error(missingSupabaseMessage) }),
  },
  from: () => createMockQuery(),
  channel: () => {
    const channel = {
      on: () => channel,
      subscribe: () => channel,
    };
    return channel;
  },
  removeChannel: () => {},
});

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabase();
export { isSupabaseConfigured };
