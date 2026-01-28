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
