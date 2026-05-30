export const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DOW_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Format a Date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD string to a local Date (no timezone shift) */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Returns true if the date falls on Saturday or Sunday */
export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

/** All dates in [start, end] inclusive */
export function getDaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur <= last) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Add / subtract months from a date, returning the 1st of the resulting month */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

/** "February 2026" */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────
// 4-week attendance blocks
// ─────────────────────────────────────────────

/** Number of days in one attendance block (4 weeks) */
export const BLOCK_LENGTH_DAYS = 28;

/**
 * The first day of block 0. Blocks are 4 weeks long, starting on this Monday.
 * Block 0: Mon 25 May 2026 – Sun 21 Jun 2026
 * Block 1: Mon 22 Jun 2026 – Sun 19 Jul 2026
 */
export const BLOCK_ANCHOR = new Date(2026, 4, 25); // 25 May 2026 (month is 0-indexed)

/** Add `delta` days to a date, returning a new local Date at midnight */
export function addDays(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

/** Whole-day difference (a - b), ignoring time of day */
function dayDiff(a: Date, b: Date): number {
  const ms =
    new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime() -
    new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

/** Zero-based index of the block containing `date` (can be negative before the anchor) */
export function getBlockIndex(date: Date): number {
  return Math.floor(dayDiff(date, BLOCK_ANCHOR) / BLOCK_LENGTH_DAYS);
}

/** Start (inclusive) and end (inclusive) dates of the block at `index` */
export function getBlockRange(index: number): { start: Date; end: Date } {
  const start = addDays(BLOCK_ANCHOR, index * BLOCK_LENGTH_DAYS);
  const end = addDays(start, BLOCK_LENGTH_DAYS - 1);
  return { start, end };
}

/** The block (start/end) containing today */
export function getCurrentBlockRange(): { start: Date; end: Date } {
  return getBlockRange(getBlockIndex(new Date()));
}

/** "Block 25 May – 21 Jun 2026" style label for the block starting at `start` */
export function formatBlockLabel(start: Date, end: Date): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startOpts: Intl.DateTimeFormatOptions = sameYear
    ? { day: 'numeric', month: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  const endOpts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('en-GB', startOpts)} – ${end.toLocaleDateString('en-GB', endOpts)}`;
}

/** Stable storage key for a block, derived from its start date (YYYY-MM-DD) */
export function blockKey(start: Date): string {
  return formatDate(start);
}

/** "1 Feb 2026 – 28 Feb 2026" */
export function formatRangeLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`;
}

/** Short display: "18 Feb" */
export function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Returns a flat array of YYYY-MM-DD strings for the 4-week block beginning at
 * `blockStart` (a Monday). Always exactly 28 cells, Monday-first, no padding.
 */
export function getBlockGrid(blockStart: Date): string[] {
  const cells: string[] = [];
  for (let i = 0; i < BLOCK_LENGTH_DAYS; i++) {
    cells.push(formatDate(addDays(blockStart, i)));
  }
  return cells;
}

/** YYYY-MM-DD string for today */
export function todayStr(): string {
  return formatDate(new Date());
}
