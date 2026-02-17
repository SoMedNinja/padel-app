import { useCallback } from 'react';

export const useHaptics = () => {
  const trigger = useCallback(() => {
    // Note for non-coders: this creates a small vibration on Android devices to make buttons feel more responsive.
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10); // Short vibration for feedback
    }
  }, []);

  return { trigger };
};

export default useHaptics;
