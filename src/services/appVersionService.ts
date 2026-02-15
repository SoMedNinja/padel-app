import { supabase } from "../supabaseClient";

export interface AppVersionPolicy {
  minimumSupportedVersion: string;
  latestAvailableVersion: string | null;
  releaseNotes: string | null;
}

export type AppVersionState =
  | { kind: "upToDate" }
  | { kind: "updateRecommended"; policy: AppVersionPolicy }
  | { kind: "updateRequired"; policy: AppVersionPolicy };

interface AppVersionPolicyRow {
  minimum_version: string | null;
  latest_version: string | null;
  release_notes: string | null;
}

const WEB_PLATFORM = "web";

// Note for non-coders: this value is the app build number we compare against policy rules from Supabase.
const CURRENT_WEB_APP_VERSION = ((import.meta as any).env?.VITE_APP_VERSION as string | undefined) ?? "0";

// Note for non-coders: these env vars are a safety net so we can still show upgrade guidance if the policy table is unreachable.
const FALLBACK_MINIMUM_VERSION = ((import.meta as any).env?.VITE_MINIMUM_SUPPORTED_WEB_VERSION as string | undefined) ?? null;
const FALLBACK_LATEST_VERSION = ((import.meta as any).env?.VITE_LATEST_AVAILABLE_WEB_VERSION as string | undefined) ?? null;
const FALLBACK_RELEASE_NOTES = ((import.meta as any).env?.VITE_WEB_RELEASE_NOTES as string | undefined) ?? null;

export async function fetchWebPolicyFromServer(): Promise<AppVersionPolicy | null> {
  try {
    const { data, error } = await supabase
      .from("app_version_policies")
      .select("minimum_version,latest_version,release_notes")
      .eq("platform", WEB_PLATFORM)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data?.length) return null;

    return mapRowToPolicy(data[0] as AppVersionPolicyRow);
  } catch {
    return null;
  }
}

export function bundledWebPolicyFallback(): AppVersionPolicy | null {
  const minimumVersion = normalized(FALLBACK_MINIMUM_VERSION);
  if (!minimumVersion) return null;

  return {
    minimumSupportedVersion: minimumVersion,
    latestAvailableVersion: normalized(FALLBACK_LATEST_VERSION),
    releaseNotes: normalized(FALLBACK_RELEASE_NOTES),
  };
}

export async function resolveWebPolicy(): Promise<AppVersionPolicy | null> {
  const serverPolicy = await fetchWebPolicyFromServer();
  return serverPolicy ?? bundledWebPolicyFallback();
}

export function evaluateWebVersionPolicy(currentVersion: string, policy: AppVersionPolicy): AppVersionState {
  const normalizedCurrentVersion = normalized(currentVersion) ?? "0";

  if (compareVersions(normalizedCurrentVersion, policy.minimumSupportedVersion) < 0) {
    return { kind: "updateRequired", policy };
  }

  if (policy.latestAvailableVersion && compareVersions(normalizedCurrentVersion, policy.latestAvailableVersion) < 0) {
    return { kind: "updateRecommended", policy };
  }

  return { kind: "upToDate" };
}

export function getCurrentWebAppVersion(): string {
  return normalized(CURRENT_WEB_APP_VERSION) ?? "0";
}

export function compareVersions(lhs: string, rhs: string): number {
  const left = lhs.split(".").map((chunk) => Number.parseInt(chunk, 10)).map((part) => (Number.isNaN(part) ? 0 : part));
  const right = rhs.split(".").map((chunk) => Number.parseInt(chunk, 10)).map((part) => (Number.isNaN(part) ? 0 : part));
  const maxLength = Math.max(left.length, right.length);

  for (let i = 0; i < maxLength; i += 1) {
    const leftPart = left[i] ?? 0;
    const rightPart = right[i] ?? 0;

    if (leftPart < rightPart) return -1;
    if (leftPart > rightPart) return 1;
  }

  return 0;
}

function mapRowToPolicy(row: AppVersionPolicyRow): AppVersionPolicy | null {
  const minimumVersion = normalized(row.minimum_version);
  if (!minimumVersion) return null;

  return {
    minimumSupportedVersion: minimumVersion,
    latestAvailableVersion: normalized(row.latest_version),
    releaseNotes: normalized(row.release_notes),
  };
}

function normalized(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
