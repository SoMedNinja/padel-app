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

/**
 * Note for non-coders: this interface describes the minimal set of methods
 * we expect from a Supabase query builder when the real database is missing.
 */
interface MockResponse<T = any> {
  data: T;
  error: any;
  count?: number | null;
}

interface MockQueryBuilder {
  select: (columns?: string) => MockQueryBuilder;
  insert: (values: any) => MockQueryBuilder;
  update: (values: any) => MockQueryBuilder;
  upsert: (values: any) => MockQueryBuilder;
  delete: () => MockQueryBuilder;
  eq: (column: string, value: any) => MockQueryBuilder;
  lt: (column: string, value: any) => MockQueryBuilder;
  lte: (column: string, value: any) => MockQueryBuilder;
  or: (filters: string) => MockQueryBuilder;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => MockQueryBuilder;
  limit: (count: number) => MockQueryBuilder;
  single: () => MockQueryBuilder;
  filter: (column: string, operator: string, value: any) => MockQueryBuilder;
  not: (column: string, operator: string, value: any) => MockQueryBuilder;
  then: <TResult1 = MockResponse, TResult2 = never>(
    onFulfilled?: ((value: MockResponse) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onRejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ) => Promise<TResult1 | TResult2>;
  catch: <TResult = never>(
    onRejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null
  ) => Promise<MockResponse | TResult>;
  finally: (onFinally?: (() => void) | undefined | null) => Promise<MockResponse>;
}

/**
 * Note for non-coders: this interface describes the minimal set of methods
 * we expect from a Supabase auth client when the real database is missing.
 */
interface MockAuth {
  getUser: () => Promise<{ data: { user: any }; error: any }>;
  onAuthStateChange: (callback: any) => { data: { subscription: { unsubscribe: () => void } } };
  signUp: (credentials: any) => Promise<{ data: any; error: any }>;
  signInWithPassword: (credentials: any) => Promise<{ data: any; error: any }>;
  resetPasswordForEmail: (email: string, options?: any) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<{ error: any }>;
  getSession: () => Promise<{ data: { session: any }; error: any }>;
  refreshSession: () => Promise<{ data: { session: any }; error: any }>;
}

/**
 * Note for non-coders: this interface describes the minimal set of methods
 * we expect from the main Supabase client when the real database is missing.
 */
interface MockSupabase {
  auth: MockAuth;
  from: (table: string) => MockQueryBuilder;
  channel: (name: string) => any;
  removeChannel: (channel: any) => void;
  functions: {
    invoke: (name: string, options?: any) => Promise<{ data: any; error: any }>;
  };
  rpc: (name: string, args?: any) => Promise<{ data: any; error: any }>;
}

const createMockQuery = (): MockQueryBuilder => {
  const response: MockResponse = { data: [], error: null, count: 0 };
  const query: MockQueryBuilder = {
    select: () => query,
    insert: () => query,
    update: () => query,
    upsert: () => query,
    delete: () => query,
    eq: () => query,
    lt: () => query,
    lte: () => query,
    or: () => query,
    order: () => query,
    limit: () => query,
    single: () => query,
    filter: () => query,
    not: () => query,
    then: (onFulfilled, onRejected) => Promise.resolve(response).then(onFulfilled, onRejected),
    catch: (onRejected) => Promise.resolve(response).catch(onRejected),
    finally: (onFinally) => Promise.resolve(response).finally(onFinally),
  };
  return query;
};

const createMockSupabase = (): MockSupabase => ({
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
    refreshSession: () =>
      Promise.resolve({ data: { session: null }, error: new Error(missingSupabaseMessage) }),
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
  functions: {
    invoke: (_name: string, _options?: any) =>
      Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
  },
  rpc: (_name: string, _args?: any) =>
    Promise.resolve({ data: null, error: new Error(missingSupabaseMessage) }),
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
