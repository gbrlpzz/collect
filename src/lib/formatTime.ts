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

/** A compact, locale-aware status time with the exact value available as a title. */
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

export function formatCalendarDate(
  value: string | Date | null | undefined,
): string {
  const date = parseDate(value);
  if (!date) return value ? String(value) : "Not recorded";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    date,
  );
}
