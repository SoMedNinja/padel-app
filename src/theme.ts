/* AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY.
 * Note for non-coders: this web theme is generated from design/tokens.json
 * so changing one token file updates web + iOS together.
 */

import { createTheme } from '@mui/material/styles';
import { designTokens } from './generated/designTokens';

type ThemeMode = 'light' | 'dark';

const semantic = designTokens.color.semantic;
const radius = designTokens.radius;
const typographyScale = designTokens.typography.scale;
const typographyWeight = designTokens.typography.weight;

function buildTheme(mode: ThemeMode) {
  const modeSemantic = semantic[mode];

  return createTheme({
    palette: {
      mode,
      primary: {
        main: modeSemantic.primary,
        dark: modeSemantic.primaryStrong,
        contrastText: modeSemantic.onPrimary,
      },
      secondary: {
        main: modeSemantic.secondary,
      },
      success: {
        main: modeSemantic.success,
      },
      warning: {
        main: modeSemantic.warning,
      },
      info: {
        main: modeSemantic.info,
      },
      background: {
        default: modeSemantic.background,
        paper: modeSemantic.surface,
      },
      text: {
        primary: modeSemantic.textPrimary,
        secondary: modeSemantic.textSecondary,
      },
      divider: modeSemantic.borderSubtle,
    },
    shape: {
      borderRadius: radius.lg,
    },
    typography: {
      fontFamily: designTokens.typography.fontFamily,
      h1: {
        fontSize: `${typographyScale.display / 16}rem`,
        fontWeight: typographyWeight.extrabold,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: `${typographyScale.title / 16}rem`,
        fontWeight: typographyWeight.bold,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: `${typographyScale.section / 16}rem`,
        fontWeight: typographyWeight.bold,
      },
      body1: {
        fontSize: `${typographyScale.bodyLarge / 16}rem`,
      },
      body2: {
        fontSize: `${typographyScale.body / 16}rem`,
      },
      caption: {
        fontSize: `${typographyScale.caption / 16}rem`,
      },
      button: {
        textTransform: 'none',
        fontWeight: typographyWeight.semibold,
      },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
            padding: `${designTokens.spacing.sm}px ${designTokens.spacing.lg}px`,
          },
          containedPrimary: {
            boxShadow: mode === 'dark' ? 'none' : '0 6px 16px rgba(211, 47, 47, 0.24)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: radius.xl,
            boxShadow: mode === 'dark' ? 'none' : '0 8px 18px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${modeSemantic.borderSubtle}`,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: radius.xl,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: radius.pill,
            fontWeight: typographyWeight.bold,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: radius.lg,
          },
        },
      },
    },
  });
}

export const lightTheme = buildTheme('light');
export const darkTheme = buildTheme('dark');
