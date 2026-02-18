
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Mock Supabase Client
const createMockSupabase = () => {
  return {
    from: (table: string) => ({
      delete: () => ({
        eq: (col: string, val: string) => ({
          eq: async (col2: string, val2: string) => {
             // Simulate network delay for delete
             await new Promise(resolve => setTimeout(resolve, 50));
             return { error: null };
          },
          in: async (col2: string, vals: string[]) => {
             // Simulate network delay for bulk delete
             await new Promise(resolve => setTimeout(resolve, 50));
             return { error: null };
          }
        })
      })
    })
  };
};

// Mock WebPush
const mockWebPush = {
  sendNotification: async (sub: any, payload: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 20));

    if (sub.shouldFail) {
      const err: any = new Error("Gone");
      err.statusCode = 410;
      throw err;
    }
    return {};
  }
};

const runBenchmark = async (count: number, failRate: number) => {
  const supabase = createMockSupabase();
  const subscriptions = Array.from({ length: count }, (_, i) => ({
    device_token: `token_${i}`,
    platform: "web",
    subscription: { endpoint: `https://example.com/${i}`, shouldFail: i < count * failRate },
    profile_id: `user_${i}`
  }));

  console.log(`Running benchmark with ${count} subscriptions, ${failRate * 100}% failure rate`);

  // Original Implementation Logic (simplified for benchmark)
  const startOriginal = performance.now();

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await mockWebPush.sendNotification(sub.subscription, "payload");
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("device_token", sub.device_token)
          .eq("platform", "web");
      }
    }
  }));

  const endOriginal = performance.now();
  console.log(`Original implementation took: ${(endOriginal - startOriginal).toFixed(2)}ms`);

  // Optimized Implementation Logic
  const startOptimized = performance.now();
  const tokensToDelete: string[] = [];

  await Promise.all(subscriptions.map(async (sub) => {
    try {
      await mockWebPush.sendNotification(sub.subscription, "payload");
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        tokensToDelete.push(sub.device_token);
      }
    }
  }));

  if (tokensToDelete.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("device_token", tokensToDelete)
      .eq("platform", "web");
  }

  const endOptimized = performance.now();
  console.log(`Optimized implementation took: ${(endOptimized - startOptimized).toFixed(2)}ms`);

  return {
      original: endOriginal - startOriginal,
      optimized: endOptimized - startOptimized
  }
};

runBenchmark(100, 0.1).then(() => console.log("Done"));
