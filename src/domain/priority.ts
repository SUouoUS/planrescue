// ─── Priority Scoring ───
// MVP priority policy values (not scientifically optimized)

import type { Task } from './types';
import { daysUntilDeadline } from './time-calc';

/**
 * Calculate priority score for a task.
 * 
 * MVP policy values:
 * - importance: low=100, medium=200, high=300
 * - deadline: today or past=80, tomorrow=40, within 3 days=20, else=0
 * - teamImpact: none=0, low=30, high=60
 * 
 * These are pragmatic starting values, not scientifically optimized.
 */
export function calculatePriorityScore(task: Task, now?: Date): number {
  // Importance score
  const importanceScores: Record<string, number> = {
    low: 100,
    medium: 200,
    high: 300,
  };
  const importanceScore = importanceScores[task.importance] ?? 100;

  // Deadline score
  const days = daysUntilDeadline(task.deadline, now);
  let deadlineScore = 0;
  if (days !== null) {
    if (days <= 0) deadlineScore = 80;      // today or past
    else if (days <= 1) deadlineScore = 40;  // tomorrow
    else if (days <= 3) deadlineScore = 20;  // within 3 days
    // else 0
  }
  // null deadline → 0 (not treated as urgent)

  // Team impact score
  const teamImpactScores: Record<string, number> = {
    none: 0,
    low: 30,
    high: 60,
  };
  const teamScore = teamImpactScores[task.teamImpact] ?? 0;

  return importanceScore + deadlineScore + teamScore;
}

/**
 * Compare two tasks for sorting by priority.
 * Tiebreaking order:
 * 1. Higher priority score first
 * 2. Manual order (if provided)
 * 3. Earlier deadline first (null deadlines go last)
 * 4. Shorter estimated time first
 * 5. Stable id sort
 */
export function compareTasks(
  a: Task,
  b: Task,
  manualOrder: string[],
  now?: Date
): number {
  // 1. Priority score (higher first)
  const scoreA = calculatePriorityScore(a, now);
  const scoreB = calculatePriorityScore(b, now);
  if (scoreA !== scoreB) return scoreB - scoreA;

  // 2. Manual order
  const orderA = manualOrder.indexOf(a.id);
  const orderB = manualOrder.indexOf(b.id);
  const hasOrderA = orderA !== -1;
  const hasOrderB = orderB !== -1;
  if (hasOrderA && hasOrderB && orderA !== orderB) return orderA - orderB;
  if (hasOrderA && !hasOrderB) return -1;
  if (!hasOrderA && hasOrderB) return 1;

  // 3. Earlier deadline first (null goes to end)
  if (a.deadline && b.deadline) {
    const diff = new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (diff !== 0) return diff;
  } else if (a.deadline && !b.deadline) {
    return -1;
  } else if (!a.deadline && b.deadline) {
    return 1;
  }

  // 4. Shorter time first
  const minA = a.estimatedMinutes ?? Infinity;
  const minB = b.estimatedMinutes ?? Infinity;
  if (minA !== minB) return minA - minB;

  // 5. Stable id sort
  return a.id.localeCompare(b.id);
}
