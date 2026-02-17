import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export function useSwipeToBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const startRef = useRef<{ x: number, y: number } | null>(null);

  useEffect(() => {
    // Only allow swipe back if we are NOT at the root level pages where native tab nav/drawer usually exists.
    // E.g., dashboard, history, schedule are "root" tabs. Match details, Profile etc are sub-pages.
    const rootPages = ["/dashboard", "/history", "/schedule", "/admin", "/"];
    const isRoot = rootPages.includes(location.pathname);

    // However, user might be deep in history stack even on dashboard?
    // Usually swipe back takes you UP the hierarchy or BACK in history.
    // Let's assume any swipe from edge attempts to go navigate(-1).
    // Browser default behavior (overscroll-history) might conflict.
    // We prevent default if we detect our swipe? No, passive listeners can't prevent default.
    // If we want to override browser native swipe, we need non-passive and e.preventDefault().
    // But iOS Safari native swipe is very strong. We might be fighting it.

    // The request is "Implement a touch gesture system allowing swipe-from-edge to go 'Back'."
    // If the browser already does this (iOS Safari), do we need it?
    // Yes, for PWA "standalone" mode where browser chrome is hidden, sometimes native swipe doesn't work
    // or we want it to feel like an app within the webview.

    // Standalone PWAs on iOS *do* support native swipe back if there is history.
    // But often the UI doesn't visually respond until the navigation completes.

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;

      // Edge swipe zone: 0 to 40px
      if (x < 40) {
        startRef.current = { x, y };
      } else {
        startRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!startRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startRef.current.x;
      const deltaY = touch.clientY - startRef.current.y;

      // Reset
      startRef.current = null;

      // Logic:
      // 1. Must be a horizontal swipe (deltaX > deltaY)
      // 2. Must be positive (left to right)
      // 3. Must be significant distance (> 100px)
      // 4. Must not be a root page where back might exit the app?
      //    Actually navigate(-1) is safe, if no history it does nothing.

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100 && deltaX > 0) {
        // Trigger back
        navigate(-1);
      }
    };

    // We use passive listeners so scrolling isn't blocked.
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, location.pathname]);
}
