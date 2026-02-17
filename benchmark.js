const assert = require('assert');

// Configuration
const TOTAL_USERS = 5000;
const PARTICIPANTS_COUNT = 20;
const PAGE_SIZE = 50;
const BATCH_SIZE = 10;
const LATENCY_PER_CALL = 50; // ms

// Mock Data
const allUserIds = Array.from({ length: TOTAL_USERS }, (_, i) => `user_${i}`);
const participantIds = Array.from({ length: PARTICIPANTS_COUNT }, (_, i) => `user_${Math.floor(Math.random() * TOTAL_USERS)}`);

// Metrics
let listUsersCalls = 0;
let getUserByIdCalls = 0;

// Mock Supabase Client
const mockSupabase = {
  auth: {
    admin: {
      listUsers: async ({ page, perPage }) => {
        listUsersCalls++;
        await new Promise(resolve => setTimeout(resolve, LATENCY_PER_CALL));
        const start = (page - 1) * perPage;
        const end = start + perPage;
        const users = allUserIds.slice(start, end).map(id => ({ id }));
        return { data: { users }, error: null };
      },
      getUserById: async (id) => {
        getUserByIdCalls++;
        await new Promise(resolve => setTimeout(resolve, LATENCY_PER_CALL));
        return { data: { user: { id } }, error: null };
      }
    }
  }
};

async function oldApproach() {
  listUsersCalls = 0;
  const startTime = Date.now();

  const allUsers = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const { data: usersData, error } = await mockSupabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw error;
    if (!usersData?.users) break;
    allUsers.push(...usersData.users);
    hasMore = usersData.users.length === PAGE_SIZE;
    page += 1;
  }

  // Filter for participants (simulation)
  const users = allUsers.filter(u => participantIds.includes(u.id));

  const duration = Date.now() - startTime;
  return { duration, calls: listUsersCalls, usersFound: users.length };
}

async function newApproach() {
  getUserByIdCalls = 0;
  const startTime = Date.now();

  const uniqueIds = [...new Set(participantIds)];
  const allUsers = [];

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const batch = uniqueIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(id => mockSupabase.auth.admin.getUserById(id)));
    results.forEach(result => {
      if (result.data && result.data.user) {
        allUsers.push(result.data.user);
      }
    });
  }

  const duration = Date.now() - startTime;
  return { duration, calls: getUserByIdCalls, usersFound: allUsers.length };
}

(async () => {
  console.log(`Benchmarking with ${TOTAL_USERS} total users and ${PARTICIPANTS_COUNT} participants.`);
  console.log(`Simulated latency: ${LATENCY_PER_CALL}ms per API call.`);

  console.log('\n--- Old Approach ---');
  const oldResult = await oldApproach();
  console.log(`Duration: ${oldResult.duration}ms`);
  console.log(`API Calls: ${oldResult.calls}`);

  console.log('\n--- New Approach ---');
  const newResult = await newApproach();
  console.log(`Duration: ${newResult.duration}ms`);
  console.log(`API Calls: ${newResult.calls}`);

  const improvement = oldResult.duration / newResult.duration;
  console.log(`\nSpeedup: ${improvement.toFixed(1)}x`);
})();
