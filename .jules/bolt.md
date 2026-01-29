## 2025-05-15 - [Rolling Window Optimization for Time-Series Data]
**Learning:** Calculating rolling statistics (like a 30-day MVP winner) by re-filtering the entire match history for every single day in the period results in $O(Days \times Players \times Matches)$ complexity, which becomes a major bottleneck as the database grows.
**Action:** Implement a rolling window algorithm that maintains a running state and only updates it by adding/removing matches as the window slides. This reduces complexity to $O(Matches + Days \times Players)$.

## 2025-05-15 - [ISO String Lexicographical Comparison vs Date Objects]
**Learning:** Creating thousands of `new Date()` objects inside tight loops or sort functions is significantly slower than using ISO 8601 string lexicographical comparisons. ISO strings (YYYY-MM-DD...) sort correctly as plain strings.
**Action:** Use string comparisons for date filtering and sorting whenever dates are in ISO format. Avoid redundant `new Date()` instantiations.

## 2025-05-15 - [Binary Search for Virtualized Lists]
**Learning:** Linear scans ($O(N)$) to find visible items in a virtualized list can cause noticeable frame drops when the list grows large.
**Action:** Use binary search ($O(\log N)$) on the pre-calculated item offsets to find the visible range, ensuring smooth scrolling even with thousands of items.

## 2026-01-28 - [Single-Pass Search for Best Partner]
**Learning:** Using `Object.entries().map().filter().sort()[0]` to find a single maximum item from a record results in multiple intermediate array allocations and an (N \log N)$ sort. For a hot-path calculation like ELO that runs on every match change, this adds unnecessary overhead.
**Action:** Use a single-pass `for...in` loop to find the best item in (N)$ with zero extra allocations.

## 2026-01-29 - [UTC vs Local Hour for Time-of-Day Badges]
**Learning:** Extracting hours from ISO strings using `slice(11, 13)` returns the UTC hour, which can cause regressions if the application logic expects local time (e.g., for "Night Owl" badges).
**Action:** While string sorting and date filtering should always use ISO strings for performance, continue using `new Date().getHours()` when local time is functionally required, but ensure the `Date` object is instantiated only once per loop iteration.

## 2026-05-20 - [Lifting Computations and Pre-indexing in Render Loops]
**Learning:** Performing array lookups (like `.find()`) and recalculating shared data (like team averages) inside a nested `.map()` within a React render path leads to exponential work ($O(Matches \times Players \times Players)$).
**Action:** Lift shared calculations out of the inner loops and pre-index array data into a `Map` ($O(1)$ lookup) to linearize the complexity.

## 2026-01-29 - [Redundant Stats Scan in usePadelData]
**Learning:** Re-calculating recent results for every player using a utility that scans the entire match history results in (Players \times Matches)$ complexity. Since the ELO calculation already processes matches in a single pass and populates this history, re-scanning is entirely redundant.
**Action:** Reuse the results already accumulated during the ELO calculation.

## 2026-01-29 - [Non-memoized Stats in Render Path]
**Learning:** Calling (Matches)$ utility functions like synergy or rivalry calculations directly in a component's render path (or IIFE) causes significant overhead on every re-render.
**Action:** Always wrap expensive statistical calculations in `useMemo` when they depend on large datasets like match history.

## 2024-05-21 - [Intl.DateTimeFormat Caching]
**Learning:** Creating new `Intl.DateTimeFormat` instances inside tight loops or high-frequency render paths (like tables or charts) is extremely expensive, taking ~3.7ms per 10 iterations. Reusing instances via a Map-based cache reduces this to ~0.1ms (~31x faster).
**Action:** Always cache and reuse `Intl.DateTimeFormat` instances based on their locale and options.

## 2024-05-21 - [Avoiding Array Cloning in Hot Paths]
**Learning:** Common patterns like `[...arr].reverse().find()` or `arr.slice(-5).filter()` create intermediate array allocations that add up in virtualized lists or data-heavy views.
**Action:** Use single-pass loops (especially reverse loops for tail-end data) to achieve O(N) complexity with zero extra allocations. Move these calculations into memoized data-processing blocks rather than calling them directly in the render path.

## 2024-05-21 - [Leveraging Pre-aggregated Data in Sub-components]
**Learning:** Re-calculating complex statistics (like wins, losses, or ELO averages) inside sub-components when the parent has already computed them for the same dataset results in redundant O(P * M) work.
**Action:** Use an `isFiltered` or similar flag to let sub-components know when they can bypass expensive re-calculation logic and directly use the pre-aggregated data passed through props.
