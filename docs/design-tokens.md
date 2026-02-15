# Design tokens and cross-platform UI recipes

> Note for non-coders: a "design token" is just a named style value (like "brand primary color") so teams can change one place and update many screens.

## Token pipeline (single source of truth)

- Canonical token file: `design/tokens.json`.
- Generate platform files with: `npm run tokens:generate` (this now also regenerates `src/theme.ts`).
- Generated outputs:
  - Web theme file: `src/theme.ts`
  - Web TypeScript tokens: `src/generated/designTokens.ts`
  - Web CSS variables: `src/generated/design-tokens.css`
  - iOS Swift tokens: `ios-native/PadelNative/Theme/GeneratedDesignTokens.swift`
- Drift check for CI/local verification: `npm run tokens:check` (fails if generated files are out of date).

> Note for non-coders: this means we update style values once in `design/tokens.json`, then regenerate both apps so they stay in sync.

## 1) Semantic color tokens

Use semantic names first, not raw hex codes, so web and iOS stay aligned even if the exact shade is tuned per platform.

| Semantic token | Web (MUI) | iOS (SwiftUI) | Meaning |
|---|---|---|---|
| `brandPrimary` | `palette.primary.main` (`#d32f2f`) | `AppColors.brandPrimary` (`AccentColor`) | Main brand/action color |
| `brandPrimaryStrong` | `palette.primary.dark` (`#b71c1c`) | `AppColors.brandPrimary` (strong variant where needed) | Deep emphasis |
| `accentWarm` | `palette.secondary.main` (`#ff8f00`) | `AppColors.warning` or secondary accent in local component | Warm supporting accent |
| `success` | `palette.success.main` | `AppColors.success` | Positive confirmation |
| `warning` | `palette.warning.main` | `AppColors.warning` | Warning/attention |
| `surface` | `palette.background.paper` | `Color(.systemBackground)` | Main card/surface |
| `surfaceMuted` | `palette.background.default` | `AppColors.surfaceMuted` | Subtle grouped surface |
| `textPrimary` | `palette.text.primary` | `Color.primary` | Main text |
| `textSecondary` | `palette.text.secondary` | `AppColors.textSecondary` | Helper/meta text |
| `borderSubtle` | `palette.divider` | `AppColors.borderSubtle` | Card/input borders |

### Color intent rules

1. Use `brandPrimary` for **brand and primary actions**.
2. Use `success` only for **successful outcomes** (saved, synced, completed).
3. Use `warning` for **cautionary states**.
4. Avoid introducing one-off colors unless there's a clear semantic need.

## 2) Component recipes (cross-platform intent)

> Note for non-coders: these recipes make screens feel like one product family, while still using each platform's native controls.

### Primary action button
- **Intent:** main task on a screen (save, continue, create).
- **Web:** MUI `Button variant="contained" color="primary"` with theme shadow/rounded corners.
- **iOS:** `PrimaryButtonStyle()`.

### Secondary action
- **Intent:** optional or less-prominent action.
- **Web:** outlined/text button variants.
- **iOS:** `.buttonStyle(.bordered)`.

### Card/container
- **Intent:** group related content.
- **Web:** MUI `Card/Paper` with theme border radius + border.
- **iOS:** `SectionCard` with `AppColors.surfaceMuted` background.

### Status chip
- **Intent:** compact state labels like open/closed.
- **Web:** MUI `Chip` with semantic color.
- **iOS:** `StatusChip(title:tint:)`.

### Empty state
- **Intent:** explain why data is empty and what to do next.
- **Web:** `EmptyState` component.
- **iOS:** section text + optional action button styled by intent.

## 3) Typography policy

> Note for non-coders: typography "policy" means agreed rules for heading/body sizes and emphasis.

- Keep **hierarchy aligned**, not exact fonts.
- Web keeps Inter-first stack from `src/theme.ts`.
- iOS keeps SF/System fonts for native readability and Dynamic Type behavior.

Semantic text roles:
- **Display**: hero headings / very large emphasis.
- **Title**: page/screen titles.
- **Section**: card or section headings.
- **Body**: normal descriptive text.
- **Caption/Meta**: hints, helper text, secondary stats.

## 4) Platform-native policy

- We align on **meaning and hierarchy** across web + iOS.
- We do **not** force pixel-perfect cloning between platforms.
- iOS should keep native feel (NavigationStack, List/Form behavior, Dynamic Type), while maintaining the same product identity and priorities.
