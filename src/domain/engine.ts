// ─── Plan Rescue Engine ───
// Deterministic scheduling engine: pure TypeScript, no UI/LLM dependency.
// Same input + same reference time = same output.

import type {
  Task,
  DayInput,
  PlanResult,
  TaskDecision,
  ScheduleBlock,
  Warning,
  TimeInterval,
  RescueAction,
} from './types';
import {
  parseHHmm,
  formatHHmm,
  fixedSchedulesToIntervals,
  mergeIntervals,
  computeFreeSlots,
  computePlacementCap,
  totalIntervalMinutes,
  findContiguousSlot,
  consumeSlot,
  deadlineToMinutes,
  isDeadlinePast,
  daysUntilDeadline,
  detectOverlaps,
} from './time-calc';
import { calculatePriorityScore, compareTasks } from './priority';

const MAX_SEARCH_STATES = 10000;

interface CandidateTask {
  task: Task;
  minutes: number;  // effective minutes to schedule
  isReduced: boolean;
  scope: string | null;
  deadlineMin: number | null; // deadline as minutes from midnight, or null
  priorityScore: number;
  mustToday: boolean;
  dropAllowed: boolean;
  userOverride: 'AUTO' | 'KEEP' | 'REDUCE' | 'POSTPONE' | 'DROP';
}

/**
 * Main entry point: generate a PlanResult from tasks and day input.
 * @param tasks - All tasks
 * @param dayInput - Day configuration
 * @param nowOverride - Inject current time for testability
 */
export function generatePlan(
  tasks: Task[],
  dayInput: DayInput,
  inputRevision: number,
  nowOverride?: Date
): PlanResult {
  const now = nowOverride ?? new Date();
  const warnings: Warning[] = [];

  // 1. Input validation
  const planStart = parseHHmm(dayInput.startAt);
  const planEnd = parseHHmm(dayInput.endAt);

  if (planEnd <= planStart) {
    return makeErrorResult(inputRevision, now, '종료 시각이 시작 시각보다 빠르거나 같습니다.');
  }

  // 2. Fixed schedule normalization
  const fixedIntervals = fixedSchedulesToIntervals(
    dayInput.fixedSchedules,
    planStart,
    planEnd
  );

  // Detect overlapping fixed schedules
  const overlaps = detectOverlaps(fixedIntervals);
  for (const overlap of overlaps) {
    warnings.push({
      type: 'missing_info',
      taskId: null,
      message: `고정 일정이 ${formatHHmm(overlap.interval1.start)}~${formatHHmm(overlap.interval1.end)}과 ${formatHHmm(overlap.interval2.start)}~${formatHHmm(overlap.interval2.end)} 구간에서 ${overlap.overlapMinutes}분 겹칩니다.`,
    });
  }

  const mergedFixed = mergeIntervals(fixedIntervals);

  // 3. Compute free slots
  const freeSlots = computeFreeSlots(planStart, planEnd, mergedFixed);
  const totalFreeMinutes = totalIntervalMinutes(freeSlots);
  const placementCap = computePlacementCap(freeSlots, dayInput.remainingBudgetMinutes);

  // 4. Separate tasks into categories
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const selectedTasks = dayInput.selectedTaskIds
    .map(id => taskMap.get(id))
    .filter((t): t is Task => t !== undefined);

  const decisions: TaskDecision[] = [];
  const excluded: { task: Task; reason: string; code: string }[] = [];

  // Separate completed, blocked, no-time tasks
  const schedulable: Task[] = [];
  for (const task of selectedTasks) {
    if (task.status === 'completed') {
      decisions.push(makeDecision(task, null, false, 'completed', '이미 완료된 작업입니다.'));
      continue;
    }
    if (task.status === 'reduced_done_needs_review') {
      decisions.push(makeDecision(task, null, false, 'reduced_done', '축소 수행 완료, 잔여업무 확인 필요합니다.'));
      continue;
    }
    if (task.blocked) {
      decisions.push(makeDecision(task, null, false, 'blocked', `외부 대기 중: ${task.blockedReason ?? '사유 없음'}`));
      warnings.push({
        type: 'blocked_task',
        taskId: task.id,
        message: `'${task.title}'은(는) 외부 대기 상태입니다.`,
      });
      continue;
    }
    if (task.estimatedMinutes === null) {
      decisions.push(makeDecision(task, null, false, 'missing_time', '예상 소요시간을 입력해주세요.'));
      warnings.push({
        type: 'missing_info',
        taskId: task.id,
        message: `'${task.title}'의 소요시간이 입력되지 않았습니다.`,
      });
      continue;
    }

    // Past deadline warning
    if (task.deadline && isDeadlinePast(task.deadline, now)) {
      warnings.push({
        type: 'past_deadline',
        taskId: task.id,
        message: `'${task.title}'의 마감이 이미 지났습니다.`,
      });
    }

    schedulable.push(task);
  }

  // 5. Build candidates with overrides
  const candidates: CandidateTask[] = schedulable.map(task => {
    const override = dayInput.userOverrides[task.id] ?? 'AUTO';
    const mustToday = dayInput.mustTodayTaskIds.includes(task.id);
    const dropAllowed = dayInput.dropAllowedTaskIds.includes(task.id);
    const dlMin = task.deadline ? deadlineToMinutes(task.deadline, dayInput.date) : null;
    const score = calculatePriorityScore(task, now);

    return {
      task,
      minutes: task.estimatedMinutes!,
      isReduced: false,
      scope: null,
      deadlineMin: dlMin,
      priorityScore: score,
      mustToday,
      dropAllowed,
      userOverride: override,
    };
  });

  // 6. Apply user overrides first
  const forceKeep: CandidateTask[] = [];
  const forceReduce: CandidateTask[] = [];
  const forcePostpone: CandidateTask[] = [];
  const forceDrop: CandidateTask[] = [];
  const autoPool: CandidateTask[] = [];

  for (const c of candidates) {
    switch (c.userOverride) {
      case 'KEEP':
        forceKeep.push(c);
        break;
      case 'REDUCE': {
        const r = c.task.reduction;
        if (r && r.approvedByUser && r.minutes > 0 && r.minutes < c.minutes) {
          forceReduce.push({
            ...c,
            minutes: r.minutes,
            isReduced: true,
            scope: r.scope,
          });
        } else {
          // No approved reduction — can't REDUCE, warn and treat as auto
          warnings.push({
            type: 'missing_info',
            taskId: c.task.id,
            message: `'${c.task.title}'에 승인된 최소 범위가 없어 REDUCE를 적용할 수 없습니다.`,
          });
          autoPool.push(c);
        }
        break;
      }
      case 'POSTPONE':
        if (c.mustToday) {
          warnings.push({
            type: 'must_today_conflict',
            taskId: c.task.id,
            message: `'${c.task.title}'은(는) 오늘 필수이므로 POSTPONE할 수 없습니다.`,
          });
          autoPool.push(c);
        } else {
          forcePostpone.push(c);
        }
        break;
      case 'DROP':
        if (c.mustToday) {
          warnings.push({
            type: 'must_today_conflict',
            taskId: c.task.id,
            message: `'${c.task.title}'은(는) 오늘 필수이므로 DROP할 수 없습니다.`,
          });
          autoPool.push(c);
        } else {
          forceDrop.push(c);
        }
        break;
      default:
        autoPool.push(c);
    }
  }

  // Record forced postpone/drop decisions
  for (const c of forcePostpone) {
    decisions.push(makeDecision(c.task, 'POSTPONE', false, 'user_override', '사용자가 미루기를 선택했습니다.'));
  }
  for (const c of forceDrop) {
    decisions.push(makeDecision(c.task, 'DROP', false, 'user_override', '사용자가 오늘 제외를 선택했습니다.'));
  }

  // 7. Sort auto pool by priority
  autoPool.sort((a, b) => compareTasks(a.task, b.task, dayInput.manualOrder, now));

  // 8. Check if everything fits at original scope
  const totalForced = forceKeep.reduce((s, c) => s + c.minutes, 0)
    + forceReduce.reduce((s, c) => s + c.minutes, 0);
  const totalAuto = autoPool.reduce((s, c) => s + c.minutes, 0);

  // 9. Scheduling algorithm
  // Combine force-keep, force-reduce, and auto pool for placement
  const toPlace: CandidateTask[] = [];
  const notPlaced: CandidateTask[] = [];

  // Force-keep goes in first
  for (const c of forceKeep) {
    toPlace.push(c);
  }
  // Force-reduce goes in
  for (const c of forceReduce) {
    toPlace.push(c);
  }

  // Check if all auto tasks fit in remaining budget
  let budgetRemaining = placementCap - totalForced;

  if (budgetRemaining >= totalAuto) {
    // Everything fits at original scope → all KEEP
    for (const c of autoPool) {
      toPlace.push(c);
    }
  } else {
    // Need to prioritize and potentially reduce
    for (const c of autoPool) {
      if (c.mustToday) {
        // Must include. Try original first, then reduce.
        if (budgetRemaining >= c.minutes) {
          toPlace.push(c);
          budgetRemaining -= c.minutes;
        } else {
          // Try approved reduction
          const r = c.task.reduction;
          if (r && r.approvedByUser && r.minutes > 0 && r.minutes < c.minutes && budgetRemaining >= r.minutes) {
            toPlace.push({
              ...c,
              minutes: r.minutes,
              isReduced: true,
              scope: r.scope,
            });
            budgetRemaining -= r.minutes;
          } else {
            // Can't fit even reduced — still add to placement attempt
            // (will likely fail placement and generate conflict warning)
            toPlace.push(c);
            budgetRemaining -= c.minutes;
          }
        }
      } else if (budgetRemaining >= c.minutes) {
        toPlace.push(c);
        budgetRemaining -= c.minutes;
      } else {
        // Try reduction
        const r = c.task.reduction;
        if (r && r.approvedByUser && r.minutes > 0 && r.minutes < c.minutes && budgetRemaining >= r.minutes) {
          toPlace.push({
            ...c,
            minutes: r.minutes,
            isReduced: true,
            scope: r.scope,
          });
          budgetRemaining -= r.minutes;
        } else {
          notPlaced.push(c);
        }
      }
    }
  }

  // 10. Place tasks on timeline
  // Strategy: try deadline-order placement first, then priority-order
  const placementResult = attemptPlacement(toPlace, freeSlots, dayInput.date, now, placementCap);

  // If deadline-order is better, use it
  const deadlineSorted = [...toPlace].sort((a, b) => {
    // Tasks with deadlines go first, ordered by deadline
    if (a.deadlineMin !== null && b.deadlineMin !== null) return a.deadlineMin - b.deadlineMin;
    if (a.deadlineMin !== null) return -1;
    if (b.deadlineMin !== null) return 1;
    return compareTasks(a.task, b.task, dayInput.manualOrder, now);
  });
  const deadlinePlacement = attemptPlacement(deadlineSorted, freeSlots, dayInput.date, now, placementCap);

  // Choose the placement that schedules more tasks
  const bestPlacement = deadlinePlacement.placed.length >= placementResult.placed.length
    ? deadlinePlacement : placementResult;

  // 11. Build final decisions and schedule blocks
  const scheduleBlocks: ScheduleBlock[] = [];
  const placedTaskIds = new Set(bestPlacement.placed.map(p => p.candidate.task.id));
  let totalAllocated = 0;

  for (const p of bestPlacement.placed) {
    const c = p.candidate;
    const action: RescueAction = c.isReduced ? 'REDUCE' : 'KEEP';

    decisions.push({
      taskId: c.task.id,
      action,
      scheduled: true,
      originalScope: c.task.title,
      originalMinutes: c.task.estimatedMinutes,
      appliedScope: c.isReduced ? c.scope : null,
      appliedMinutes: c.minutes,
      reasonCode: c.isReduced ? 'reduced_to_fit' : 'fits_in_schedule',
      reasonText: c.isReduced
        ? `시간 부족으로 '${c.scope}'(으)로 범위를 축소했습니다. (${c.task.estimatedMinutes}분 → ${c.minutes}분)`
        : '원래 범위 그대로 수행합니다.',
    });

    scheduleBlocks.push({
      taskId: c.task.id,
      startAt: formatHHmm(p.startAt),
      endAt: formatHHmm(p.endAt),
      appliedScope: c.isReduced ? c.scope : null,
      appliedMinutes: c.minutes,
    });

    totalAllocated += c.minutes;
  }

  // Handle unplaced tasks that were supposed to be placed
  for (const c of toPlace) {
    if (!placedTaskIds.has(c.task.id)) {
      if (c.mustToday) {
        // Must-today conflict
        decisions.push({
          taskId: c.task.id,
          action: null,
          scheduled: false,
          originalScope: c.task.title,
          originalMinutes: c.task.estimatedMinutes,
          appliedScope: null,
          appliedMinutes: null,
          reasonCode: 'must_today_no_fit',
          reasonText: `오늘 필수 작업이지만 연속 ${c.minutes}분 구간을 배치할 수 없습니다. 범위 조정, 작업 가능 시간 변경, 또는 오늘 필수 해제를 검토해주세요.`,
        });
        warnings.push({
          type: 'must_today_conflict',
          taskId: c.task.id,
          message: `'${c.task.title}'은(는) 오늘 필수이지만 배치할 수 없습니다. 시간 부족: ${c.minutes}분 필요.`,
        });
      } else {
        // Couldn't auto-place → POSTPONE
        decisions.push(makeDecision(c.task, 'POSTPONE', false, 'auto_no_fit',
          `자동 배치를 찾지 못했습니다. 연속 ${c.minutes}분 구간이 부족합니다.`));
        warnings.push({
          type: 'auto_placement_failed',
          taskId: c.task.id,
          message: `'${c.task.title}'의 자동 배치를 찾지 못했습니다.`,
        });
      }
    }
  }

  // Handle notPlaced (low priority → POSTPONE or DROP)
  for (const c of notPlaced) {
    if (c.dropAllowed && !c.mustToday && !hasDeadlineToday(c.task, dayInput.date)) {
      decisions.push(makeDecision(c.task, 'DROP', false, 'drop_allowed',
        '시간 부족으로 오늘 제외합니다. (오늘 제외 허용됨)'));
    } else {
      decisions.push(makeDecision(c.task, 'POSTPONE', false, 'time_shortage',
        '시간이 부족하여 미룹니다.'));
    }
  }

  // 12. Deadline risk check for placed tasks
  for (const p of bestPlacement.placed) {
    const c = p.candidate;
    if (c.deadlineMin !== null && p.endAt > c.deadlineMin) {
      warnings.push({
        type: 'deadline_risk',
        taskId: c.task.id,
        message: `'${c.task.title}'의 종료(${formatHHmm(p.endAt)})가 마감(${formatHHmm(c.deadlineMin)})을 넘깁니다.`,
      });
    }
    // Check reduction ≠ original completion
    if (c.isReduced) {
      const r = c.task.reduction;
      if (r && !r.satisfiesOriginalCompletion && c.task.deadline) {
        warnings.push({
          type: 'deadline_risk',
          taskId: c.task.id,
          message: `'${c.task.title}'의 축소 수행이 원래 마감 조건을 충족하지 않을 수 있습니다. 잔여 범위를 확인해주세요.`,
        });
      }
    }
  }

  // Check if any must-today tasks have conflicts
  const unscheduledMustToday = dayInput.mustTodayTaskIds.filter(id =>
    !placedTaskIds.has(id) && !decisions.some(d => d.taskId === id && (d.action === null))
  );

  const hasMustTodayConflict = warnings.some(w => w.type === 'must_today_conflict');

  const slackMinutes = placementCap - totalAllocated;

  return {
    inputRevision,
    referenceTime: now.toISOString(),
    createdAt: now.toISOString(),
    decisions,
    scheduleBlocks,
    warnings,
    stats: {
      totalFreeMinutes,
      budgetMinutes: dayInput.remainingBudgetMinutes,
      allocatedMinutes: totalAllocated,
      slackMinutes: Math.max(0, slackMinutes),
    },
    isPreview: true,
  };
}

// ─── Placement Algorithm ───

interface PlacedTask {
  candidate: CandidateTask;
  startAt: number;
  endAt: number;
}

interface PlacementResult {
  placed: PlacedTask[];
  unplaced: CandidateTask[];
}

/**
 * Attempt to place candidates into free slots in the given order.
 * Uses greedy first-fit with deadline constraints.
 * Tracks budget to ensure total doesn't exceed cap.
 */
function attemptPlacement(
  candidates: CandidateTask[],
  initialFreeSlots: TimeInterval[],
  planDate: string,
  now: Date,
  budgetCap: number,
): PlacementResult {
  let slots = [...initialFreeSlots.map(s => ({ ...s }))];
  const placed: PlacedTask[] = [];
  const unplaced: CandidateTask[] = [];
  let totalPlaced = 0;

  for (const c of candidates) {
    if (totalPlaced + c.minutes > budgetCap) {
      unplaced.push(c);
      continue;
    }

    const placement = findContiguousSlot(slots, c.minutes, c.deadlineMin);
    if (placement) {
      placed.push({
        candidate: c,
        startAt: placement.startAt,
        endAt: placement.endAt,
      });
      slots = consumeSlot(slots, placement.slotIndex, placement.startAt, placement.endAt);
      totalPlaced += c.minutes;
    } else {
      unplaced.push(c);
    }
  }

  return { placed, unplaced };
}

// ─── Helpers ───

function makeDecision(
  task: Task,
  action: RescueAction | null,
  scheduled: boolean,
  code: string,
  text: string
): TaskDecision {
  return {
    taskId: task.id,
    action,
    scheduled,
    originalScope: task.title,
    originalMinutes: task.estimatedMinutes,
    appliedScope: null,
    appliedMinutes: null,
    reasonCode: code,
    reasonText: text,
  };
}

function makeErrorResult(revision: number, now: Date, errorMsg: string): PlanResult {
  return {
    inputRevision: revision,
    referenceTime: now.toISOString(),
    createdAt: now.toISOString(),
    decisions: [],
    scheduleBlocks: [],
    warnings: [{
      type: 'missing_info',
      taskId: null,
      message: errorMsg,
    }],
    stats: {
      totalFreeMinutes: 0,
      budgetMinutes: 0,
      allocatedMinutes: 0,
      slackMinutes: 0,
    },
    isPreview: true,
  };
}

function hasDeadlineToday(task: Task, planDate: string): boolean {
  if (!task.deadline) return false;
  const dlMin = deadlineToMinutes(task.deadline, planDate);
  return dlMin !== null;
}

// ─── Validator ───

/**
 * Independent final validator: re-checks placement against constraints.
 * Returns list of violations.
 */
export function validatePlanResult(
  result: PlanResult,
  tasks: Task[],
  dayInput: DayInput
): Warning[] {
  const violations: Warning[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  const planStart = parseHHmm(dayInput.startAt);
  const planEnd = parseHHmm(dayInput.endAt);
  const fixedIntervals = fixedSchedulesToIntervals(dayInput.fixedSchedules, planStart, planEnd);
  const mergedFixed = mergeIntervals(fixedIntervals);
  const freeSlots = computeFreeSlots(planStart, planEnd, mergedFixed);

  // Check total allocated <= budget
  if (result.stats.allocatedMinutes > dayInput.remainingBudgetMinutes) {
    violations.push({
      type: 'budget_exceeded',
      taskId: null,
      message: `배정 시간(${result.stats.allocatedMinutes}분)이 작업 예산(${dayInput.remainingBudgetMinutes}분)을 초과합니다.`,
    });
  }

  // Check each block is within free slots and no overlaps
  const blocks = result.scheduleBlocks;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const start = parseHHmm(b.startAt);
    const end = parseHHmm(b.endAt);

    // Check within plan range
    if (start < planStart || end > planEnd) {
      violations.push({
        type: 'auto_placement_failed',
        taskId: b.taskId,
        message: `'${taskMap.get(b.taskId)?.title}'의 배치(${b.startAt}~${b.endAt})가 계획 범위를 벗어납니다.`,
      });
    }

    // Check not overlapping with fixed schedules
    for (const fixed of mergedFixed) {
      if (start < fixed.end && end > fixed.start) {
        violations.push({
          type: 'auto_placement_failed',
          taskId: b.taskId,
          message: `'${taskMap.get(b.taskId)?.title}'의 배치가 고정 일정과 겹칩니다.`,
        });
      }
    }

    // Check deadline
    const task = taskMap.get(b.taskId);
    if (task?.deadline) {
      const dlMin = deadlineToMinutes(task.deadline, dayInput.date);
      if (dlMin !== null && end > dlMin) {
        const decision = result.decisions.find(d => d.taskId === b.taskId);
        // Only flag if it's not a reduced task that user accepted
        violations.push({
          type: 'deadline_risk',
          taskId: b.taskId,
          message: `'${task.title}'의 종료(${b.endAt})가 마감(${formatHHmm(dlMin)})을 넘깁니다.`,
        });
      }
    }

    // Check no block overlaps
    for (let j = i + 1; j < blocks.length; j++) {
      const other = blocks[j];
      const otherStart = parseHHmm(other.startAt);
      const otherEnd = parseHHmm(other.endAt);
      if (start < otherEnd && end > otherStart) {
        violations.push({
          type: 'auto_placement_failed',
          taskId: b.taskId,
          message: `'${taskMap.get(b.taskId)?.title}'과 '${taskMap.get(other.taskId)?.title}'의 배치가 겹칩니다.`,
        });
      }
    }
  }

  // Check must-today tasks are scheduled
  for (const id of dayInput.mustTodayTaskIds) {
    const isScheduled = blocks.some(b => b.taskId === id);
    const decision = result.decisions.find(d => d.taskId === id);
    if (!isScheduled && decision?.action !== 'KEEP' && decision?.action !== 'REDUCE') {
      const task = taskMap.get(id);
      if (task && task.status === 'incomplete' && !task.blocked && task.estimatedMinutes !== null) {
        violations.push({
          type: 'must_today_conflict',
          taskId: id,
          message: `오늘 필수 작업 '${task?.title}'이(가) 배치되지 않았습니다.`,
        });
      }
    }
  }

  return violations;
}
