import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const missingSupabaseMessage =
  "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.";

if (!isSupabaseConfigured) {
  console.warn("Missing Supabase environment variables.");
}

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
