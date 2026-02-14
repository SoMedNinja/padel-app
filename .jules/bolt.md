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

## 2024-05-22 - [Avoiding Redundant Normalization and Sorting]
**Learning:** Frequent calls to data normalization utilities (like `normalizeTeam`) and unnecessary $O(N \log N)$ sorting for "top-N" selection can dominate the execution time of statistics calculations as the dataset grows.
**Action:** Normalize data once and reuse it. Replace full sorts with single-pass $O(N)$ selection loops when only the best item is needed.

## 2026-02-10 - [O(N) Search for Latest Match]
**Learning:** Using `sort()` to find the latest match by date is $O(N \log N)$ and involves creating thousands of `Date` objects in the comparator. ISO 8601 strings can be compared directly.
**Action:** Use a single-pass `for` loop with a string comparison to find the maximum ISO date string in $O(N)$.

## 2026-02-10 - [Pre-indexing History for Highlight Calculations]
**Learning:** Performing `.find()` or `.filter()` on player history within a match loop results in $O(M \times P \times H)$ complexity.
**Action:** Pre-index the specific history entries needed into a `Map` ($O(M \times P)$) before entering the match loop to achieve $O(1)$ lookups.

## 2026-02-10 - [Identity-based Cache Keys for Intl.DateTimeFormat]
**Learning:** Even with a Map-based cache, calling `JSON.stringify(options)` on every format call adds measurable overhead, especially when default options are created as new objects on every call.
**Action:** Use a constant for default options and perform an identity check (`===`) to use a static cache key, bypassing stringification for the most common path.

## 2025-06-12 - [Filter-Before-Map and ISO String Slicing]
**Learning:** Performing expensive operations (like ID resolution) on a full dataset before filtering it for a small subset results in significant redundant work. Additionally, comparing dates via ISO string slicing (`.slice(0, 10)`) is much faster than instantiating `new Date()` and calling `.toDateString()` inside large loops.
**Action:** Always filter large datasets as early as possible and prefer string-based date comparisons for "same-day" logic when data is stored in ISO 8601 format.

## 2026-05-22 - [Short-Circuiting Redundant Sorts]
**Learning:** The application frequently sorts match lists by `created_at` DESC. Since the database/service often provides them in this order already, performing an $O(N \log N)$ sort and array clone on every render cycle is a major waste.
**Action:** Implement a linear $O(N)$ check for sort order before calling `.sort()`. Return the original array reference if already sorted to preserve referential stability and skip the work.

## 2026-06-15 - [Leveraging Pre-Calculated ELO Maps]
**Learning:** Redundant scans through player histories ($O(P \times H)$) to calculate period-specific stats (MVP, Synergy, Highlights) become a massive bottleneck as the match history grows. Since the ELO calculation already builds the entire history in a single pass, it can produce $O(1)$ lookup maps for deltas and ratings.
**Action:** Pass `eloDeltaByMatch` and `eloRatingByMatch` maps to all statistical utility functions. Replace $O(P \times H)$ history scans with $O(M \times P_{per\_match})$ lookups using these maps. This reduces computation from millions of iterations to a few thousand for a typical dashboard load.

## 2026-02-01 - [Lazy Metadata Resolution in ELO loop]
**Learning:** Calling metadata resolution utilities (like name or badge lookups) for every player in every match within the main ELO calculation loop results in thousands of redundant Map lookups and string operations.
**Action:** Move metadata resolution inside the lazy initialization logic of the player record. Only resolve and store metadata when a player is first encountered in the history.

## 2026-02-01 - [Single-Pass Loop for Array Transformation]
**Learning:** Using chained array methods like `.filter().map().filter()` for ID-to-name resolution creates multiple intermediate array objects and iterates over the list multiple times.
**Action:** Use a single `for` loop to perform filtering and mapping in a single pass with zero extra allocations.

## 2026-02-02 - [Native Comparison vs localeCompare in Tables]
**Learning:** Using `localeCompare` in a sort function for a table with many rows adds significant overhead. Standard string comparison (`<`, `>`) is much faster and sufficient for most use cases where linguistic sorting is not strictly required.
**Action:** Use native comparison operators in hot-path sort functions.

## 2026-02-02 - [Identity-Based Hits for Intl Cache]
**Learning:** Even with a Map-based cache for `Intl.DateTimeFormat`, passing inline options objects `{ month: 'short' }` forced the cache to rely on `JSON.stringify` for key generation.
**Action:** Pre-define common options as constants to leverage identity equality (`===`) in the cache lookup.

## 2026-05-23 - [Direct Team Sorting for Pairs]
**Learning:** Using `sort()` on a 2-element array (like a padel team) is significantly slower than a direct comparison and swap, as it avoids the overhead of the generic sort algorithm and intermediate array cloning.
**Action:** Use manual swap logic `p1 < p2 ? [p1, p2] : [p2, p1]` for small arrays where the size is known to be at most 2.

## 2026-05-23 - [Avoiding Redundant Aggregation Loops]
**Learning:** Iterating over every player's entire match history ($O(P \times H)$) to aggregate stats for a filtered leaderboard is inefficient. When the dataset is filtered, it is much faster to iterate over the filtered match list once ($O(M_{filtered})$).
**Action:** Aggregate statistics by iterating over the filtered matches instead of scanning full player histories when a filter is active.

## 2026-05-23 - [Lazy vs Early Normalization]
**Learning:** Performing expensive normalization (like resolving names from IDs) for an entire dataset before it's needed in a sub-utility leads to significant wasted computation.
**Action:** Delay normalization until it's actually required by the specific data path, especially when high-performance alternatives (like ID-based lookups) exist.

## 2026-06-20 - [Redundant Mapping in usePadelData]
**Learning:** The `usePadelData` hook was performing a second pass over the player list and creating a new `Map` for avatars, even though the `calculateElo` utility already populates `avatarUrl` and `recentResults`. This resulted in unnecessary (P)$ memory allocations and processing on every render cycle.
**Action:** Remove redundant mapping passes and reuse the data already populated by the calculation engine.

## 2026-06-20 - [Loop Consolidation and Imperative Loops in ELO Path]
**Learning:** ELO calculation processing thousands of matches is sensitive to function call overhead and multiple array iterations. Consolidating profile initialization into a single loop and replacing `.forEach()` with traditional `for` loops in the match processing path significantly improves throughput.
**Action:** Use consolidated loops for setup and imperative `for` loops in high-frequency data processing paths.

## 2026-06-20 - [Array.from Performance in Virtualized Lists]
**Learning:** `Array.from({ length: N }, ...)` is significantly slower than a manual `for` loop for large $ because of the overhead of creating the array-like object and the internal iterator. In virtualized lists that re-calculate offsets on every frame/scroll, this can lead to jank.
**Action:** Use `new Array(itemCount)` followed by a `for` loop for generating large data arrays in performance-critical hooks.

## 2026-06-25 - [O(N) Sort Order Validation in Swift]
**Learning:** Calling `.sorted()` on already sorted arrays in Swift still incurs (N \log N)$ complexity and closure overhead. Using a linear (N)$ check for both ascending and descending order allows skipping the sort or using the much faster `.reversed()` ((N)$ and type-wrapped) for descending inputs.
**Action:** Implement a dual-direction sort check before performing expensive array sorts on chronological datasets.

## 2026-06-25 - [UUID Parsing Overhead in Hot Loops]
**Learning:** Repeatedly calling `UUID(uuidString:)` for the same player IDs across thousands of matches adds measurable latency. Caching both successful and failed (nil) results in a local `[String: UUID?]` map significantly improves throughput in batch stats calculations.
**Action:** Use a local dictionary-based cache for UUID parsing in any loop processing large datasets of string-based identifiers.

## 2026-06-25 - [SwiftUI Property Memoization in AppViewModel]
**Learning:** Computed properties on `@ObservedObject` that perform (N)$ or (P)$ work (like filtering, mapping, or sorting) can lead to UI jank as they are re-evaluated on every view refresh.
**Action:** Convert expensive computed properties into `@Published` stored properties that are updated only when the source data (`matches`, `players`) actually changes.

## 2026-06-25 - [Active Player Filtering in Rolling Windows]
**Learning:** Iterating over all players in every step of a rolling 30-day window ((D \times P)$) is wasteful when most players are inactive in that period.
**Action:** Maintain a set of "active" player IDs within the window and only iterate over those IDs for daily winner calculations.

## 2026-06-25 - [O(1) Delta Lookups and Match-Centric MVP]
**Learning:** Performing O(H) searches in every match of a loop results in O(M * H) complexity, which is effectively O(N^2) for active players. Additionally, scanning all player histories (O(P * H)) for a filtered MVP window is highly redundant.
**Action:** Pre-index ELO deltas into a [PlayerID: [MatchID: Int]] map once. Refactor MVP logic to iterate over the match list (O(M_filtered)) instead of scanning player histories (O(P * H)), using the pre-indexed map for O(1) delta lookups.
