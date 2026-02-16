# Performance Optimization: Bounding Match Results

## Problem: Unbounded Result Set
The `matchService.getMatches` function previously fetched all records from the `matches` table without a limit. As the application grows, this "unbounded result set" causes several performance issues:
1. **Network Payload:** Transferring thousands of matches over the network increases latency and data usage.
2. **Client Memory:** Storing a large array of match objects in client-side state (Zustand/React Query) consumes significant memory.
3. **CPU Overhead:** Iterating over thousands of matches for filtering, sorting, and ELO calculation on every render or state change becomes a bottleneck.
4. **Database Load:** Unbounded queries can strain the database, especially if multiple users are fetching the entire history simultaneously.

## Solution: Pagination and Bounding
We implemented pagination support in the `getMatches` service using Supabase's `.range()` capability and added a default limit of 100 results.
- **Service Layer:** Added `limit` and `offset` to `MatchFilter`.
- **Default Bounding:** If no limit is specified, the service now defaults to 100 records.
- **Explicit Override:** Components that require more data (like ELO calculation) can explicitly request a larger bounded set (e.g., 5000), which is still safer than an unbounded query.

## Measurement and Rationale
Empirical measurement in the current development environment was impractical due to:
- **Mock Supabase:** The sandbox environment uses a mock Supabase client that returns empty data instantly.
- **Environment Limitations:** Lack of internet access prevented the installation of specialized profiling tools or large-scale data seeding.

Despite the lack of a live benchmark, adding pagination is a industry-standard "net positive" performance improvement that prevents O(N) scalability issues from becoming O(Infinity).
