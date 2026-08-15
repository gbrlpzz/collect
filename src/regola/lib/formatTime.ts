// Vendored snapshot from @gbrlpzz/regola (private, proprietary upstream).
// Licensed under Apache-2.0 as part of collect.
// Source: https://github.com/gbrlpzz/regola  .  Refreshed by `regola-sync`.
// Do not edit here expecting changes to reach upstream.

/**
 * Time formatting helpers for PWA and field tools.
 */

const RELATIVE_UNITS: Array<{
  unit: Intl.RelativeTimeFormatUnit;
  milliseconds: number;
}> = [
  { unit: "year", milliseconds: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", milliseconds: 24 * 60 * 60 * 1000 },
  { unit: "hour", milliseconds: 60 * 60 * 1000 },
  { unit: "minute", milliseconds: 60 * 1000 },
];

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Compact, locale-aware relative timestamp ("just now", "5 minutes ago", etc.)
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  now = new Date(),
): string {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "Not yet";
  const difference = date.getTime() - now.getTime();
  const absolute = Math.abs(difference);
  if (absolute < 45 * 1000) return "Just now";
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const selected =
    RELATIVE_UNITS.find(({ milliseconds }) => absolute >= milliseconds) ??
    RELATIVE_UNITS.at(-1)!;
  return formatter.format(
    Math.round(difference / selected.milliseconds),
    selected.unit,
  );
}

/**
 * Full exact timestamp formatted for localized display.
 */
export function formatExactTime(
  value: string | Date | null | undefined,
): string | undefined {
  const date = parseDate(value);
  if (!date) return undefined;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

/**
 * Calendar date only (e.g. "Aug 15, 2026").
 */
export function formatCalendarDate(
  value: string | Date | null | undefined,
): string {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "Not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}
