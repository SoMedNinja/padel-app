/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Note for non-coders: this TypeScript file is generated from design/tokens.json
 * so web and iOS can share one visual language.
 */

export const designTokens = {
  "$schema": "https://example.com/design-tokens.schema.json",
  "color": {
    "semantic": {
      "dark": {
        "background": "#121417",
        "borderStrong": "#6b4242",
        "borderSubtle": "#32353a",
        "error": "#ef5350",
        "highlight": "#2c2020",
        "info": "#4fc3f7",
        "onPrimary": "#140102",
        "primary": "#ef5350",
        "primaryStrong": "#e53935",
        "secondary": "#ffb74d",
        "success": "#66bb6a",
        "surface": "#1e1e1e",
        "surfaceMuted": "#26282c",
        "textPrimary": "#f5f5f5",
        "textSecondary": "#b0b4ba",
        "warning": "#ffb74d"
      },
      "light": {
        "background": "#f6f7fb",
        "borderStrong": "#f0b7b7",
        "borderSubtle": "#ececec",
        "error": "#d32f2f",
        "highlight": "#fff5f5",
        "info": "#0288d1",
        "onPrimary": "#ffffff",
        "primary": "#d32f2f",
        "primaryStrong": "#b71c1c",
        "secondary": "#ff8f00",
        "success": "#2e7d32",
        "surface": "#ffffff",
        "surfaceMuted": "#f6f7fb",
        "textPrimary": "#1f1f1f",
        "textSecondary": "#6d6d6d",
        "warning": "#ed6c02"
      }
    }
  },
  "components": {
    "card": {
      "elevation": "card",
      "padding": 24,
      "radius": 14
    },
    "chip": {
      "fontWeight": "bold",
      "height": 32,
      "radius": 999
    },
    "emptyState": {
      "iconSize": 48,
      "spacing": 12,
      "titleSize": 20
    },
    "input": {
      "height": 48,
      "radius": 12
    },
    "tab": {
      "activeWeight": "bold",
      "indicatorHeight": 2
    }
  },
  "elevation": {
    "card": {
      "blur": 18,
      "color": "#000000",
      "opacity": 0.08,
      "spread": 0,
      "x": 0,
      "y": 8
    },
    "soft": {
      "blur": 30,
      "color": "#111827",
      "opacity": 0.08,
      "spread": 0,
      "x": 0,
      "y": 10
    }
  },
  "meta": {
    "description": "Note for non-coders: this file is the single source of truth for shared design values across web and iOS.",
    "version": "1.1.0"
  },
  "motion": {
    "duration": {
      "fast": 100,
      "normal": 200,
      "slow": 300
    },
    "easing": {
      "default": [
        0.4,
        0,
        0.2,
        1
      ],
      "in": [
        0.4,
        0,
        1,
        1
      ],
      "out": [
        0,
        0,
        0.2,
        1
      ],
      "spring": [
        0.175,
        0.885,
        0.32,
        1.275
      ]
    }
  },
  "radius": {
    "lg": 12,
    "md": 10,
    "pill": 999,
    "sm": 8,
    "xl": 14
  },
  "spacing": {
    "lg": 16,
    "md": 12,
    "sm": 8,
    "xl": 24,
    "xs": 4,
    "xxl": 32
  },
  "typography": {
    "fontFamily": "-apple-system, BlinkMacSystemFont, \"Inter\", \"Segoe UI\", \"Roboto\", \"Helvetica Neue\", Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\"",
    "scale": {
      "body": 14,
      "bodyLarge": 16,
      "caption": 12,
      "display": 32,
      "section": 20,
      "title": 24
    },
    "weight": {
      "bold": 700,
      "extrabold": 800,
      "regular": 400,
      "semibold": 600
    }
  }
} as const;
