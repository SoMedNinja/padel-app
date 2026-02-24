import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loadPermissionGuideMetrics,
  savePermissionGuideMetrics,
  recordPermissionGuideMetric,
  requestOpenPermissionGuide,
  subscribePermissionGuideOpen,
  loadInstallCtaEvents,
  recordInstallCtaEvent,
  readPermissionGuideStepFromCapability,
  type PermissionGuideMetrics,
  type InstallCtaEvent
} from './permissionGuidanceService';

const METRICS_STORAGE_KEY = "padel:permissions-guide-metrics:v1";
const INSTALL_CTA_STORAGE_KEY = "padel:install-cta-events:v1";

describe('permissionGuidanceService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Metrics Management', () => {
    it('loadPermissionGuideMetrics returns empty metrics when storage is empty', () => {
      const metrics = loadPermissionGuideMetrics();
      expect(metrics).toEqual({
        install: { attempts: 0, completions: 0 },
        notifications: { attempts: 0, completions: 0 },
        background_refresh: { attempts: 0, completions: 0 },
      });
    });

    it('loadPermissionGuideMetrics parses valid stored metrics', () => {
      const stored: PermissionGuideMetrics = {
        install: { attempts: 2, completions: 1 },
        notifications: { attempts: 5, completions: 0 },
        background_refresh: { attempts: 1, completions: 1 },
      };
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(stored));

      const metrics = loadPermissionGuideMetrics();
      expect(metrics).toEqual(stored);
    });

    it('loadPermissionGuideMetrics handles partial/malformed data gracefully', () => {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify({
        install: { attempts: 2 }, // Missing completions
        notifications: null,      // Invalid type
        // background_refresh missing entirely
      }));

      const metrics = loadPermissionGuideMetrics();
      expect(metrics.install).toEqual({ attempts: 2, completions: 0 });
      expect(metrics.notifications).toEqual({ attempts: 0, completions: 0 });
      expect(metrics.background_refresh).toEqual({ attempts: 0, completions: 0 });
    });

    it('loadPermissionGuideMetrics returns empty metrics on JSON parse error', () => {
      localStorage.setItem(METRICS_STORAGE_KEY, "invalid-json");
      const metrics = loadPermissionGuideMetrics();
      expect(metrics).toEqual({
        install: { attempts: 0, completions: 0 },
        notifications: { attempts: 0, completions: 0 },
        background_refresh: { attempts: 0, completions: 0 },
      });
    });

    it('savePermissionGuideMetrics writes to localStorage', () => {
      const metrics: PermissionGuideMetrics = {
        install: { attempts: 1, completions: 1 },
        notifications: { attempts: 0, completions: 0 },
        background_refresh: { attempts: 0, completions: 0 },
      };
      savePermissionGuideMetrics(metrics);

      const stored = localStorage.getItem(METRICS_STORAGE_KEY);
      expect(JSON.parse(stored!)).toEqual(metrics);
    });

    it('recordPermissionGuideMetric increments attempts correctly', () => {
      recordPermissionGuideMetric('install', 'attempt');
      const metrics = loadPermissionGuideMetrics();
      expect(metrics.install.attempts).toBe(1);
      expect(metrics.install.completions).toBe(0);

      recordPermissionGuideMetric('install', 'attempt');
      const updated = loadPermissionGuideMetrics();
      expect(updated.install.attempts).toBe(2);
    });

    it('recordPermissionGuideMetric increments completions correctly', () => {
      recordPermissionGuideMetric('notifications', 'completion');
      const metrics = loadPermissionGuideMetrics();
      expect(metrics.notifications.completions).toBe(1);
      expect(metrics.notifications.attempts).toBe(0);
    });
  });

  describe('Event Bus', () => {
    it('requestOpenPermissionGuide dispatches custom event', () => {
      const handler = vi.fn();
      const unsubscribe = subscribePermissionGuideOpen(handler);

      requestOpenPermissionGuide('settings');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ source: 'settings' });

      unsubscribe();
    });

    it('subscribePermissionGuideOpen returns unsubscribe function', () => {
      const handler = vi.fn();
      const unsubscribe = subscribePermissionGuideOpen(handler);

      requestOpenPermissionGuide('menu');
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();
      requestOpenPermissionGuide('menu');
      expect(handler).toHaveBeenCalledTimes(1); // Should not increase
    });
  });

  describe('Install CTA Events', () => {
    it('loadInstallCtaEvents returns empty array when empty', () => {
      expect(loadInstallCtaEvents()).toEqual([]);
    });

    it('loadInstallCtaEvents handles invalid JSON', () => {
      localStorage.setItem(INSTALL_CTA_STORAGE_KEY, "invalid");
      expect(loadInstallCtaEvents()).toEqual([]);
    });

    it('recordInstallCtaEvent adds event with timestamp', () => {
      const now = 1234567890;
      vi.useFakeTimers();
      vi.setSystemTime(now);

      const event: Omit<InstallCtaEvent, "timestampMs"> = {
        surface: "permission_guide",
        cta: "run_install_step",
        promptType: "native",
        platformIntent: "chrome_android",
      };

      const recorded = recordInstallCtaEvent(event);

      expect(recorded).toEqual({ ...event, timestampMs: now });
      expect(loadInstallCtaEvents()).toHaveLength(1);
      expect(loadInstallCtaEvents()[0]).toEqual(recorded);

      vi.useRealTimers();
    });

    it('recordInstallCtaEvent maintains max limit (50)', () => {
      // Fill with 50 events
      const events: InstallCtaEvent[] = Array.from({ length: 50 }, (_, i) => ({
        surface: "install_prompt",
        cta: "snooze",
        promptType: "native",
        platformIntent: "chrome_android",
        timestampMs: i,
      }));
      localStorage.setItem(INSTALL_CTA_STORAGE_KEY, JSON.stringify(events));

      // Add one more
      recordInstallCtaEvent({
        surface: "install_prompt",
        cta: "open_permission_guide",
        promptType: "native",
        platformIntent: "chrome_android",
      });

      const loaded = loadInstallCtaEvents();
      expect(loaded).toHaveLength(50);
      // First event (timestamp 0) should be gone
      expect(loaded[0].timestampMs).not.toBe(0);
      // Last event should be the new one (we can check by property, timestamp will be current)
      expect(loaded[49].cta).toBe("open_permission_guide");
    });
  });

  describe('Helpers', () => {
    it('readPermissionGuideStepFromCapability maps correctly', () => {
      expect(readPermissionGuideStepFromCapability('notifications')).toBe('notifications');
      expect(readPermissionGuideStepFromCapability('background_refresh')).toBe('background_refresh');
      expect(readPermissionGuideStepFromCapability('install')).toBe('install');
      expect(readPermissionGuideStepFromCapability('unknown')).toBe(null);
    });
  });
});
