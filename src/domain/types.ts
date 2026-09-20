// ─── Domain Types & Zod Schemas ───
// Centralized type definitions and validation schemas for PlanRescue

import { z } from 'zod';

// ─── Enums ───
export const ImportanceLevel = z.enum(['low', 'medium', 'high']);
export type ImportanceLevel = z.infer<typeof ImportanceLevel>;

export const TeamImpact = z.enum(['none', 'low', 'high']);
export type TeamImpact = z.infer<typeof TeamImpact>;

export const TaskStatus = z.enum(['incomplete', 'completed', 'reduced_done_needs_review']);
export type TaskStatus = z.infer<typeof TaskStatus>;

export const RescueAction = z.enum(['KEEP', 'REDUCE', 'POSTPONE', 'DROP']);
export type RescueAction = z.infer<typeof RescueAction>;

export const UserOverride = z.enum(['AUTO', 'KEEP', 'REDUCE', 'POSTPONE', 'DROP']);
export type UserOverride = z.infer<typeof UserOverride>;

// ─── Reduction ───
export const ReductionSchema = z.object({
  scope: z.string().min(1).max(500),
  doneCriteria: z.string().min(1).max(500),
  minutes: z.number().int().positive(),
  approvedByUser: z.boolean(),
  satisfiesOriginalCompletion: z.boolean(),
});
export type Reduction = z.infer<typeof ReductionSchema>;

// ─── Task ───
export const TaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  notes: z.string().max(1000).nullable(),
  estimatedMinutes: z.number().int().positive().nullable(),
  deadline: z.string().nullable(),
  importance: ImportanceLevel,
  teamImpact: TeamImpact,
  blocked: z.boolean(),
  blockedReason: z.string().max(300).nullable(),
  reduction: ReductionSchema.nullable(),
  status: TaskStatus,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Task = z.infer<typeof TaskSchema>;

// ─── Fixed Schedule ───
export const FixedScheduleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200),
  startAt: z.string().regex(/^\d{2}:\d{2}$/),
  endAt: z.string().regex(/^\d{2}:\d{2}$/),
});
export type FixedSchedule = z.infer<typeof FixedScheduleSchema>;

// ─── Day Input ───
export const DayInputSchema = z.object({
  date: z.string(),
  timezone: z.literal('Asia/Seoul'),
  startAt: z.string().regex(/^\d{2}:\d{2}$/),
  endAt: z.string().regex(/^\d{2}:\d{2}$/),
  remainingBudgetMinutes: z.number().int().nonnegative(),
  fixedSchedules: z.array(FixedScheduleSchema),
  selectedTaskIds: z.array(z.string()),
  mustTodayTaskIds: z.array(z.string()),
  dropAllowedTaskIds: z.array(z.string()),
  manualOrder: z.array(z.string()),
  userOverrides: z.record(z.string(), UserOverride),
});
export type DayInput = z.infer<typeof DayInputSchema>;

// ─── Time Interval ───
export interface TimeInterval {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
}

// ─── Task Decision ───
export const TaskDecisionSchema = z.object({
  taskId: z.string(),
  action: RescueAction.nullable(),
  scheduled: z.boolean(),
  originalScope: z.string().nullable(),
  originalMinutes: z.number().nullable(),
  appliedScope: z.string().nullable(),
  appliedMinutes: z.number().nullable(),
  reasonCode: z.string(),
  reasonText: z.string(),
});
export type TaskDecision = z.infer<typeof TaskDecisionSchema>;

// ─── Schedule Block ───
export const ScheduleBlockSchema = z.object({
  taskId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  appliedScope: z.string().nullable(),
  appliedMinutes: z.number().int().positive(),
});
export type ScheduleBlock = z.infer<typeof ScheduleBlockSchema>;

// ─── Warning ───
export const WarningType = z.enum([
  'deadline_risk',
  'must_today_conflict',
  'missing_info',
  'blocked_task',
  'past_deadline',
  'auto_placement_failed',
  'budget_exceeded',
]);

export const WarningSchema = z.object({
  type: WarningType,
  taskId: z.string().nullable(),
  message: z.string(),
});
export type Warning = z.infer<typeof WarningSchema>;

// ─── Plan Result ───
export const PlanResultSchema = z.object({
  inputRevision: z.number().int(),
  referenceTime: z.string(),
  createdAt: z.string(),
  decisions: z.array(TaskDecisionSchema),
  scheduleBlocks: z.array(ScheduleBlockSchema),
  warnings: z.array(WarningSchema),
  stats: z.object({
    totalFreeMinutes: z.number(),
    budgetMinutes: z.number(),
    allocatedMinutes: z.number(),
    slackMinutes: z.number(),
  }),
  isPreview: z.boolean(),
});
export type PlanResult = z.infer<typeof PlanResultSchema>;

// ─── Postponed Task Info ───
export const PostponedInfoSchema = z.object({
  taskId: z.string(),
  originalDeadline: z.string().nullable(),
  postponedDate: z.string().nullable(),
  reason: z.string(),
});
export type PostponedInfo = z.infer<typeof PostponedInfoSchema>;

// ─── AI Suggestion Request / Response ───
export const AISuggestRequestSchema = z.object({
  taskId: z.string(),
  title: z.string().max(200),
  notes: z.string().max(1000).nullable(),
  estimatedMinutes: z.number().positive().nullable(),
  deadline: z.string().nullable(),
});
export type AISuggestRequest = z.infer<typeof AISuggestRequestSchema>;

export const AISuggestResponseSchema = z.object({
  taskId: z.string(),
  suggestedScope: z.string().max(500),
  doneCriteria: z.string().max(500),
  rationale: z.string().max(500),
  needsClarification: z.boolean(),
  question: z.string().max(300).nullable(),
});
export type AISuggestResponse = z.infer<typeof AISuggestResponseSchema>;

// ─── Backup Schema ───
export const BackupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  tasks: z.array(TaskSchema),
  dayInputs: z.array(DayInputSchema),
  appliedPlans: z.array(PlanResultSchema),
});
export type BackupData = z.infer<typeof BackupSchema>;
