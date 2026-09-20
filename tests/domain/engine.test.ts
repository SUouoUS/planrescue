import { describe, it, expect } from 'vitest';
import { generatePlan, validatePlanResult } from '../../src/domain/engine';
import { Task, DayInput, Reduction } from '../../src/domain/types';

// Helper to create a base task
function createTestTask(id: string, overrides: Partial<Task>): Task {
  return {
    id,
    title: `Task ${id}`,
    notes: null,
    estimatedMinutes: 60,
    deadline: null,
    importance: 'medium',
    teamImpact: 'none',
    blocked: false,
    blockedReason: null,
    reduction: null,
    status: 'incomplete',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create base DayInput
function createTestDayInput(overrides: Partial<DayInput>): DayInput {
  return {
    date: '2026-09-20',
    timezone: 'Asia/Seoul',
    startAt: '19:00',
    endAt: '22:00', // 180 minutes total
    remainingBudgetMinutes: 180,
    fixedSchedules: [],
    selectedTaskIds: [],
    mustTodayTaskIds: [],
    dropAllowedTaskIds: [],
    manualOrder: [],
    userOverrides: {},
    ...overrides,
  };
}

const mockNow = new Date('2026-09-20T19:00:00+09:00'); // Set fixed time for tests

describe('PlanRescue Engine Validation', () => {

  it('1. 충분한 시간: 연속 180분에 60분+45분+30분, 마감 충돌 없음 → 모두 KEEP', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: 60 }),
      createTestTask('2', { estimatedMinutes: 45 }),
      createTestTask('3', { estimatedMinutes: 30 }),
    ];
    const dayInput = createTestDayInput({
      selectedTaskIds: ['1', '2', '3'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    const violations = validatePlanResult(result, tasks, dayInput);

    expect(violations).toHaveLength(0);
    expect(result.scheduleBlocks).toHaveLength(3);
    expect(result.decisions.filter(d => d.action === 'KEEP')).toHaveLength(3);
    expect(result.stats.allocatedMinutes).toBe(135);
    expect(result.stats.slackMinutes).toBe(45);
  });

  it('2. 예산 제한: 빈 구간 합이 180분이어도 예산이 90분이면 배정은 90분 이하', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: 60, importance: 'high' }),
      createTestTask('2', { estimatedMinutes: 60, importance: 'medium' }),
    ];
    const dayInput = createTestDayInput({
      remainingBudgetMinutes: 90,
      selectedTaskIds: ['1', '2'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    
    expect(result.stats.allocatedMinutes).toBeLessThanOrEqual(90);
    // Task 1 should be KEEP, Task 2 should be POSTPONE
    expect(result.decisions.find(d => d.taskId === '1')?.action).toBe('KEEP');
    expect(result.decisions.find(d => d.taskId === '2')?.action).toBe('POSTPONE');
  });

  it('3. 고정 일정: 19:00~22:00 중 20:00~20:30 고정 → 빈 시간 150분, 겹치지 않음', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: 60 }), // 19:00 ~ 20:00
      createTestTask('2', { estimatedMinutes: 60 }), // 20:30 ~ 21:30
    ];
    const dayInput = createTestDayInput({
      fixedSchedules: [{ id: 'f1', title: 'Dinner', startAt: '20:00', endAt: '20:30' }],
      selectedTaskIds: ['1', '2'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    const violations = validatePlanResult(result, tasks, dayInput);
    
    expect(violations).toHaveLength(0);
    expect(result.stats.totalFreeMinutes).toBe(150);
    expect(result.scheduleBlocks.find(b => b.taskId === '1')?.endAt).toBe('20:00');
    expect(result.scheduleBlocks.find(b => b.taskId === '2')?.startAt).toBe('20:30');
  });

  it('4. 중복 고정 일정: 20:00~20:30과 20:15~20:45는 45분만 차감', () => {
    const dayInput = createTestDayInput({
      fixedSchedules: [
        { id: 'f1', title: 'A', startAt: '20:00', endAt: '20:30' },
        { id: 'f2', title: 'B', startAt: '20:15', endAt: '20:45' },
      ],
    });
    // 180 total - 45 overlap = 135
    const result = generatePlan([], dayInput, 1, mockNow);
    expect(result.stats.totalFreeMinutes).toBe(135);
  });

  it('5. 연속 구간 부족: 40+40 빈 구간에 60분 작업 → 자동 분할 금지', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: 60 }),
    ];
    const dayInput = createTestDayInput({
      fixedSchedules: [{ id: 'f1', title: 'Break', startAt: '19:40', endAt: '20:20' }],
      // Free: 19:00-19:40 (40), 20:20-22:00 (100) -> Wait, 20:20-22:00 is 100mins. It will fit!
      // Let's modify fixed schedule to make two 40 min slots.
      // 19:00~22:00 (180). 19:40~21:20 (100) blocked -> Free: 19:00~19:40(40), 21:20~22:00(40)
    });
    dayInput.fixedSchedules = [{ id: 'f1', title: 'Blocked', startAt: '19:40', endAt: '21:20' }];
    dayInput.selectedTaskIds = ['1'];

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    
    // Should not schedule
    expect(result.scheduleBlocks).toHaveLength(0);
    expect(result.decisions.find(d => d.taskId === '1')?.action).toBe('POSTPONE');
    expect(result.warnings.some(w => w.type === 'auto_placement_failed')).toBe(true);
  });

  it('6. 승인된 축소: 시간 부족 상황에서만 구체적 범위/시간으로 REDUCE', () => {
    const reduction: Reduction = {
      scope: 'Half', doneCriteria: 'Done half', minutes: 30, approvedByUser: true, satisfiesOriginalCompletion: false
    };
    const tasks = [
      createTestTask('1', { estimatedMinutes: 60, importance: 'high' }),
      createTestTask('2', { estimatedMinutes: 60, importance: 'medium', reduction }),
    ];
    const dayInput = createTestDayInput({
      remainingBudgetMinutes: 90, // Not enough for 60+60
      selectedTaskIds: ['1', '2'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    
    expect(result.decisions.find(d => d.taskId === '1')?.action).toBe('KEEP');
    expect(result.decisions.find(d => d.taskId === '2')?.action).toBe('REDUCE');
    expect(result.scheduleBlocks.find(b => b.taskId === '2')?.appliedMinutes).toBe(30);
  });

  it('7. 필수 충돌: 예산 60분, 오늘 필수 45분 두 개 → 충돌 표시, 시간 초과/연기 금지', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: 45 }),
      createTestTask('2', { estimatedMinutes: 45 }),
    ];
    const dayInput = createTestDayInput({
      remainingBudgetMinutes: 60,
      selectedTaskIds: ['1', '2'],
      mustTodayTaskIds: ['1', '2'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    
    // One schedules, one fails
    expect(result.scheduleBlocks).toHaveLength(1);
    expect(result.stats.allocatedMinutes).toBe(45);
    expect(result.warnings.some(w => w.type === 'must_today_conflict')).toBe(true);
    
    // Check that the failed one has action = null (not postponed)
    const failedTaskDecision = result.decisions.find(d => !d.scheduled);
    expect(failedTaskDecision?.action).toBe(null);
  });

  it('8. 마감순 배치: 19:00~20:30 (90m), A(60m, 마감20:30, high), B(30m, 마감19:30, med) → B 다음 A', () => {
    const tasks = [
      createTestTask('A', { estimatedMinutes: 60, deadline: '2026-09-20T20:30:00+09:00', importance: 'high' }),
      createTestTask('B', { estimatedMinutes: 30, deadline: '2026-09-20T19:30:00+09:00', importance: 'medium' }),
    ];
    const dayInput = createTestDayInput({
      endAt: '20:30', // 90 min total
      selectedTaskIds: ['A', 'B'],
    });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    const violations = validatePlanResult(result, tasks, dayInput);
    
    expect(violations).toHaveLength(0);
    expect(result.scheduleBlocks).toHaveLength(2);
    // B should be first
    expect(result.scheduleBlocks[0].taskId).toBe('B');
    expect(result.scheduleBlocks[1].taskId).toBe('A');
  });

  it('9. 누락/대기: 소요시간 null, blocked는 배치 안 됨', () => {
    const tasks = [
      createTestTask('1', { estimatedMinutes: null }),
      createTestTask('2', { estimatedMinutes: 60, blocked: true }),
    ];
    const dayInput = createTestDayInput({ selectedTaskIds: ['1', '2'] });

    const result = generatePlan(tasks, dayInput, 1, mockNow);
    
    expect(result.scheduleBlocks).toHaveLength(0);
    expect(result.warnings.some(w => w.type === 'missing_info')).toBe(true);
    expect(result.warnings.some(w => w.type === 'blocked_task')).toBe(true);
  });

});
