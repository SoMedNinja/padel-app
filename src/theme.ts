import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f', // --color-brand
      dark: '#b71c1c', // --color-brand-dark
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ff8f00', // used in gradient in .app-logo
    },
    background: {
      default: '#f6f7fb', // --color-bg
      paper: '#ffffff', // --color-surface
    },
    text: {
      primary: '#1f1f1f', // --color-text
      secondary: '#6d6d6d', // --color-muted
    },
    divider: '#ececec', // --color-border
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 700,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10, // --radius-md
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14, // --radius-lg
          boxShadow: '0 8px 18px rgba(0, 0, 0, 0.08)', // --shadow-card
          border: '1px solid #ececec',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 14,
        },
      },
    },
  },
});

export default theme;
