// ─── Time Calculation Utilities ───
// Pure functions for time interval operations
// All times are in minutes from midnight (Asia/Seoul)

import type { TimeInterval, FixedSchedule } from './types';

/** Parse "HH:mm" to minutes from midnight */
export function parseHHmm(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Format minutes from midnight to "HH:mm" */
export function formatHHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** Format duration in minutes to human-readable Korean string */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0분';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

/** Convert fixed schedules to TimeIntervals, clipped to [planStart, planEnd) */
export function fixedSchedulesToIntervals(
  schedules: FixedSchedule[],
  planStart: number,
  planEnd: number
): TimeInterval[] {
  return schedules
    .map(s => {
      const start = Math.max(parseHHmm(s.startAt), planStart);
      const end = Math.min(parseHHmm(s.endAt), planEnd);
      return { start, end };
    })
    .filter(i => i.start < i.end);
}

/** Merge overlapping intervals (union). Input does not need to be sorted. */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TimeInterval[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    const cur = sorted[i];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/** Calculate total duration of intervals */
export function totalIntervalMinutes(intervals: TimeInterval[]): number {
  return intervals.reduce((sum, i) => sum + (i.end - i.start), 0);
}

/**
 * Compute free (available) slots by subtracting blocked intervals from plan interval.
 */
export function computeFreeSlots(
  planStart: number,
  planEnd: number,
  blockedIntervals: TimeInterval[]
): TimeInterval[] {
  const merged = mergeIntervals(blockedIntervals);
  const free: TimeInterval[] = [];
  let cursor = planStart;

  for (const block of merged) {
    if (cursor < block.start) {
      free.push({ start: cursor, end: block.start });
    }
    cursor = Math.max(cursor, block.end);
  }

  if (cursor < planEnd) {
    free.push({ start: cursor, end: planEnd });
  }

  return free;
}

/** Compute placement cap = min(free time sum, budget) */
export function computePlacementCap(
  freeSlots: TimeInterval[],
  budgetMinutes: number
): number {
  const totalFree = totalIntervalMinutes(freeSlots);
  return Math.min(totalFree, budgetMinutes);
}

/**
 * Find first free slot that fits `durationMinutes` as contiguous block.
 * Respects deadline and afterMinutes constraints.
 */
export function findContiguousSlot(
  freeSlots: TimeInterval[],
  durationMinutes: number,
  deadlineMinutes: number | null,
  afterMinutes: number = 0
): { slotIndex: number; startAt: number; endAt: number } | null {
  for (let i = 0; i < freeSlots.length; i++) {
    const slot = freeSlots[i];
    const effectiveStart = Math.max(slot.start, afterMinutes);
    const effectiveEnd = deadlineMinutes !== null
      ? Math.min(slot.end, deadlineMinutes)
      : slot.end;

    if (effectiveStart >= effectiveEnd) continue;
    if (effectiveEnd - effectiveStart >= durationMinutes) {
      return {
        slotIndex: i,
        startAt: effectiveStart,
        endAt: effectiveStart + durationMinutes,
      };
    }
  }
  return null;
}

/** Split a free slot after placing a task */
export function consumeSlot(
  freeSlots: TimeInterval[],
  slotIndex: number,
  taskStart: number,
  taskEnd: number
): TimeInterval[] {
  const result: TimeInterval[] = [];
  for (let i = 0; i < freeSlots.length; i++) {
    if (i !== slotIndex) {
      result.push(freeSlots[i]);
    } else {
      const slot = freeSlots[i];
      if (slot.start < taskStart) {
        result.push({ start: slot.start, end: taskStart });
      }
      if (taskEnd < slot.end) {
        result.push({ start: taskEnd, end: slot.end });
      }
    }
  }
  return result;
}

/** Get today's date string in Asia/Seoul timezone (YYYY-MM-DD) */
export function getTodayDateString(now?: Date): string {
  const d = now ?? new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/** Get current time as minutes from midnight in Asia/Seoul */
export function getCurrentTimeMinutes(now?: Date): number {
  const d = now ?? new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}

/**
 * Parse ISO deadline to minutes-from-midnight on the plan date.
 * Returns null if the deadline is on a different day.
 */
export function deadlineToMinutes(
  deadline: string,
  planDate: string
): number | null {
  try {
    const dt = new Date(deadline);
    const dateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const dateStr = dateFmt.format(dt);
    if (dateStr !== planDate) return null;

    const timeFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = timeFmt.formatToParts(dt);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0');
    return hour * 60 + minute;
  } catch {
    return null;
  }
}

/** Check if deadline is already past */
export function isDeadlinePast(deadline: string, now?: Date): boolean {
  try {
    const dl = new Date(deadline);
    const current = now ?? new Date();
    return dl.getTime() < current.getTime();
  } catch {
    return false;
  }
}

/**
 * Count days until deadline from today (Asia/Seoul).
 * Negative = past, 0 = today, positive = future.
 * null deadline → null.
 */
export function daysUntilDeadline(deadline: string | null, now?: Date): number | null {
  if (!deadline) return null;
  try {
    const dl = new Date(deadline);
    const current = now ?? new Date();
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const nowDateStr = fmt.format(current);
    const dlDateStr = fmt.format(dl);
    const nowDate = new Date(nowDateStr + 'T00:00:00+09:00');
    const dlDate = new Date(dlDateStr + 'T00:00:00+09:00');
    const diffMs = dlDate.getTime() - nowDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

/** Detect overlapping intervals and return overlap info */
export function detectOverlaps(intervals: TimeInterval[]): Array<{
  interval1: TimeInterval;
  interval2: TimeInterval;
  overlapMinutes: number;
}> {
  const overlaps: Array<{
    interval1: TimeInterval;
    interval2: TimeInterval;
    overlapMinutes: number;
  }> = [];

  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];
      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);
      if (overlapStart < overlapEnd) {
        overlaps.push({
          interval1: a,
          interval2: b,
          overlapMinutes: overlapEnd - overlapStart,
        });
      }
    }
  }
  return overlaps;
}

/** Format Korean date string for display */
export function formatKoreanDate(now?: Date): string {
  const d = now ?? new Date();
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });
  return formatter.format(d);
}

/** Generate unique ID */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
