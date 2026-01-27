## 2025-05-15 - [Rolling Window Optimization for Time-Series Data]
**Learning:** Calculating rolling statistics (like a 30-day MVP winner) by re-filtering the entire match history for every single day in the period results in $O(Days \times Players \times Matches)$ complexity, which becomes a major bottleneck as the database grows.
**Action:** Implement a rolling window algorithm that maintains a running state and only updates it by adding/removing matches as the window slides. This reduces complexity to $O(Matches + Days \times Players)$.

## 2025-05-15 - [ISO String Lexicographical Comparison vs Date Objects]
**Learning:** Creating thousands of `new Date()` objects inside tight loops or sort functions is significantly slower than using ISO 8601 string lexicographical comparisons. ISO strings (YYYY-MM-DD...) sort correctly as plain strings.
**Action:** Use string comparisons for date filtering and sorting whenever dates are in ISO format. Avoid redundant `new Date()` instantiations.

## 2025-05-15 - [Binary Search for Virtualized Lists]
**Learning:** Linear scans ($O(N)$) to find visible items in a virtualized list can cause noticeable frame drops when the list grows large.
**Action:** Use binary search ($O(\log N)$) on the pre-calculated item offsets to find the visible range, ensuring smooth scrolling even with thousands of items.
