import { useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

/**
 * Dynamically updates the <meta name="theme-color"> tag to match the current MUI theme background.
 * This ensures the browser chrome (status bar, etc.) matches the app's theme in both light and dark modes.
 */
export default function ThemeColorUpdater() {
  const theme = useTheme();

  useEffect(() => {
    // Remove existing static meta tags to avoid conflicts once JS takes over
    const existingMetas = document.querySelectorAll('meta[name="theme-color"]');
    existingMetas.forEach(meta => meta.remove());

    // Create a new dynamic meta tag
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = theme.palette.background.default; // Matches theme background (e.g. #f6f7fb or #121417)
    document.head.appendChild(meta);

    return () => {
      if (document.head.contains(meta)) {
        document.head.removeChild(meta);
      }
    };
  }, [theme.palette.background.default]);

  return null;
}
