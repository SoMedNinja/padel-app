# Top 10 Product Improvements

Based on a detailed exploration of the codebase and your feedback, I have identified the top 10 improvements for the product. These are prioritized by impact and categorized by implementation size (Small, Medium, Large) as requested.

## Small (Quick Wins & Code Quality)

### 1. Add Global Error Boundary
*   **Description:** The application lacks a top-level React Error Boundary in `App.tsx` or `main.tsx`. If a component crashes, the entire app can go white. Adding a boundary ensures a user-friendly fallback UI is shown.
*   **Impact:** Improves user experience during unexpected failures.
*   **Effort:** Low.

### 2. Fix `any` Types & Strengthen TypeScript
*   **Description:** Files like `matchService.ts` use `any` casting (e.g., in `enrichMatchPayload`), which bypasses type safety. replacing these with proper interfaces or utility types would prevent subtle bugs.
*   **Impact:** Improves code reliability and developer experience.
*   **Effort:** Low.

### 3. Extract Magic Strings to Constants/Enums
*   **Description:** Strings like `"standalone"`, `"mexicano"`, and `"americano"` are hardcoded in multiple places. Moving these to a shared Enum or constant object would prevent typos and make future changes easier.
*   **Impact:** Reduces risk of typos and improves code clarity.
*   **Effort:** Low.

## Medium (Scalability & Refactoring)

### 4. Component Refactoring: `History.tsx`
*   **Description:** The `History.tsx` component is large (~500 lines) and mixes UI rendering with complex logic for editing, deleting, and filtering matches. Splitting it into smaller, focused components (e.g., `MatchList`, `MatchItem`, `MatchEditForm`) would improve readability and testability.
*   **Impact:** Makes the codebase easier to maintain and extend.
*   **Effort:** Medium.

### 5. Standardize React Query Keys
*   **Description:** While `queryKeys.ts` exists, some hooks still manually construct query keys or use inconsistent patterns. Enforcing a strict factory pattern for all query keys ensures better cache management and prevents invalidation bugs.
*   **Impact:** Reduces bugs related to stale data or incorrect cache updates.
*   **Effort:** Medium.

### 6. Add End-to-End (E2E) Testing with Playwright
*   **Description:** While unit tests exist, critical user flows like "Create Match" or "Edit Profile" lack comprehensive end-to-end verification. Adding Playwright tests would catch regressions in these key areas before deployment.
*   **Impact:** Increases confidence in releases and prevents critical bugs.
*   **Effort:** Medium.

### 7. Virtualize Match History List
*   **Description:** The match history list renders all items in the DOM (with infinite scroll appending more). Implementing virtualization (e.g., using `react-window` or `tanstack-virtual`) would significantly improve rendering performance on lower-end devices as the list grows.
*   **Impact:** Ensures smooth scrolling and interaction regardless of list size.
*   **Effort:** Medium.

## Large (Significant Architectural or Feature Changes)

### 8. Implement Internationalization (i18n)
*   **Description:** The application currently has hardcoded Swedish strings throughout (`matchService.ts`, `Dashboard.tsx`, etc.). Implementing a library like `react-i18next` would allow supporting multiple languages, a key goal for future expansion.
*   **Impact:** Enables expanding the user base beyond Swedish speakers.
*   **Effort:** High (Requires extracting all strings to JSON files and replacing them with translation keys).

### 9. Refactor Offline Queue to TanStack Query Persist
*   **Description:** The custom offline mutation queue in `matchService.ts` is complex and bespoke. Replacing it with `TanStack Query`'s `persistQueryClient` or `useMutation` with strict retry policies would simplify the codebase and rely on a battle-tested library for offline synchronization.
*   **Impact:** Improves maintainability and robustness of offline features, reducing technical debt.
*   **Effort:** High (Requires rewriting core data mutation logic).

### 10. Server-Side ELO Calculation (Future-Proofing)
*   **Description:** Currently, the client fetches ~5000 matches to calculate ELO ratings on the fly (`useEloStats.ts`). As the match history grows, this will degrade performance. Moving this logic to a Supabase Edge Function or a scheduled database job would ensure scalability.
*   **Impact:** Ensures the app remains fast even with tens of thousands of matches.
*   **Effort:** High (Requires backend logic implementation and API changes).
