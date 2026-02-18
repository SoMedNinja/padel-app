import { Match, Profile } from "./types.ts";
import { GUEST_ID, romanNumerals, BADGE_ICON_MAP, BADGE_THRESHOLD_MAP } from "./constants.ts";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const escapeHtml = (unsafe: string) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple p-limit implementation for concurrency control
export const pLimit = (concurrency: number) => {
  const queue: (() => void)[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) {
      queue.shift()!();
    }
  };

  const run = async <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    activeCount++;
    const result = (async () => fn())();
    try {
      const res = await result;
      resolve(res);
    } catch (err) {
      reject(err);
    }
    next();
  };

  const enqueue = <T>(fn: () => Promise<T>, resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => {
    queue.push(run.bind(null, fn, resolve, reject));
    if (activeCount < concurrency && queue.length > 0) {
      queue.shift()!();
    }
  };

  return <T>(fn: () => Promise<T>) => new Promise<T>((resolve, reject) => enqueue(fn, resolve, reject));
};

export const getIsoWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getFullYear() };
};

export const getISOWeekRange = (week: number, year: number) => {
  const firstThursday = new Date(year, 0, 1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  const week1Monday = new Date(firstThursday);
  week1Monday.setDate(firstThursday.getDate() - 3);
  week1Monday.setHours(0, 0, 0, 0);

  const start = new Date(week1Monday);
  start.setDate(week1Monday.getDate() + (week - 1) * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return { start, end };
};

export const renderAvatar = (avatarUrl: string | null | undefined, name: string, size = 56) => {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return avatarUrl
    ? `<img src="${avatarUrl}" alt="${name}" width="${size}" height="${size}" style="border-radius: 50%; border: 2px solid #fff; display: block;" />`
    : `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: #111; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: ${Math.max(12, Math.round(size / 2.8))}px;">${initial}</div>`;
};

export const formatShortDate = (value: string | Date) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "short" }).format(date);
};

export const formatScore = (s1: number, s2: number) => `${s1}–${s2}`;

export const buildTeamLabel = (match: Match, profileMap: Map<string, Profile>) => {
  const resolveName = (pid: string | null) => {
    if (!pid || pid === GUEST_ID) return "Gästspelare";
    if (pid.startsWith("name:")) return escapeHtml(pid.replace("name:", ""));
    return profileMap.get(pid)?.name || "Gästspelare";
  };
  const team1 = match.team1_ids.map(resolveName).join(" + ");
  const team2 = match.team2_ids.map(resolveName).join(" + ");
  return `${team1 || "Okänt lag"} vs ${team2 || "Okänt lag"}`;
};

export const toRoman = (index: number) => romanNumerals[index] || `${index + 1}`;

export const getBadgeLabelById = (badgeId: string | null | undefined) => {
  if (!badgeId) return "";
  if (BADGE_ICON_MAP[badgeId]) return BADGE_ICON_MAP[badgeId];
  const lastDash = badgeId.lastIndexOf("-");
  if (lastDash < 0) return "";
  const prefix = badgeId.slice(0, lastDash);
  const target = badgeId.slice(lastDash + 1);
  const thresholds = BADGE_THRESHOLD_MAP[prefix];
  if (!thresholds) return "";
  const index = thresholds.indexOf(Number(target));
  if (index < 0) return "";
  return `${BADGE_ICON_MAP[prefix] ?? ""} ${toRoman(index)}`.trim();
};
