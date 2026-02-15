import { createTheme } from '@mui/material/styles';
import { designTokens } from './generated/designTokens';

// Note for non-coders: instead of hardcoding style numbers/colors here,
// we read from shared tokens so web and iOS stay visually aligned.
const semantic = designTokens.color.semantic;
const radius = designTokens.radius;
const typographyScale = designTokens.typography.scale;
const typographyWeight = designTokens.typography.weight;

const theme = createTheme({
  palette: {
    primary: {
      main: semantic.primary,
      dark: semantic.primaryStrong,
      contrastText: semantic.onPrimary,
    },
    secondary: {
      main: semantic.secondary,
    },
    success: {
      main: semantic.success,
    },
    warning: {
      main: semantic.warning,
    },
    info: {
      main: semantic.info,
    },
    background: {
      default: semantic.background,
      paper: semantic.surface,
    },
    text: {
      primary: semantic.textPrimary,
      secondary: semantic.textSecondary,
    },
    divider: semantic.borderSubtle,
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
          boxShadow: '0 6px 16px rgba(211, 47, 47, 0.24)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: radius.xl,
          boxShadow: '0 8px 18px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${semantic.borderSubtle}`,
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

export default theme;
