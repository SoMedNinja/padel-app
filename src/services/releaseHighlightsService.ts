import { compareVersions } from "./appVersionService";

export interface ReleaseHighlight {
  version: string;
  title: string;
  changes: string[];
}

interface ReleaseHighlightsPayload {
  currentVersion?: string;
  releases?: ReleaseHighlight[];
}

const RELEASE_HIGHLIGHTS_URL = "/release-highlights.json";
const LAST_SEEN_VERSION_STORAGE_KEY = "padel:last-seen-whats-new-version";

// Note for non-coders: this reads a tiny JSON file from the web app so we can update release text without touching page code.
export async function loadReleaseHighlights(): Promise<ReleaseHighlightsPayload | null> {
  try {
    const response = await fetch(RELEASE_HIGHLIGHTS_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as ReleaseHighlightsPayload;
    return data;
  } catch {
    return null;
  }
}

// Note for non-coders: this remembers which app version the person has already read so we don't keep showing the same popup.
export function getLastSeenHighlightsVersion(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_SEEN_VERSION_STORAGE_KEY);
}

export function markHighlightsVersionAsSeen(version: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_SEEN_VERSION_STORAGE_KEY, version);
}

export interface CurrentReleaseResolution {
  appVersion: string;
  release: ReleaseHighlight;
  shouldShowDialog: boolean;
  shouldStoreAsSeenWithoutDialog: boolean;
}

export function resolveCurrentRelease(
  payload: ReleaseHighlightsPayload | null,
  currentAppVersion: string,
  lastSeenVersion: string | null,
): CurrentReleaseResolution | null {
  if (!payload?.releases?.length) return null;

  const targetVersion = payload.currentVersion ?? currentAppVersion ?? payload.releases[0].version;
  const release = payload.releases.find((item) => item.version === targetVersion) ?? payload.releases[0];

  // Note for non-coders:
  // On first install we set a baseline silently (no popup), so people only see "what's new" after a real update.
  if (!lastSeenVersion) {
    return {
      appVersion: targetVersion,
      release,
      shouldShowDialog: false,
      shouldStoreAsSeenWithoutDialog: true,
    };
  }

  const isNewerThanLastSeen = compareVersions(targetVersion, lastSeenVersion) > 0;

  return {
    appVersion: targetVersion,
    release,
    shouldShowDialog: isNewerThanLastSeen,
    shouldStoreAsSeenWithoutDialog: false,
  };
}
