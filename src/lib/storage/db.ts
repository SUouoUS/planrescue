import Dexie, { type EntityTable } from 'dexie';
import type { Task, DayInput, PlanResult, PostponedInfo } from '../../domain/types';
import { getTodayDateString } from '../../domain/time-calc';

export type DBPlanResult = PlanResult & { date: string };

export class PlanRescueDatabase extends Dexie {
  tasks!: EntityTable<Task, 'id'>;
  dayInputs!: EntityTable<DayInput, 'date'>;
  planResults!: EntityTable<DBPlanResult, 'date'>;
  postponed!: EntityTable<PostponedInfo, 'taskId'>;

  constructor() {
    super('PlanRescueDB');
    this.version(1).stores({
      tasks: 'id, status, deadline, createdAt',
      dayInputs: 'date',
      planResults: 'date',
      postponed: 'taskId, postponedDate'
    });
  }
}

export const db = new PlanRescueDatabase();

// ─── Repository Functions ───

export async function getAllTasks(): Promise<Task[]> {
  return await db.tasks.toArray();
}

export async function getActiveTasks(): Promise<Task[]> {
  return await db.tasks
    .filter(t => t.status !== 'completed' && t.status !== 'reduced_done_needs_review')
    .toArray();
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  return await db.tasks.get(id);
}

export async function saveTask(task: Task): Promise<void> {
  await db.tasks.put(task);
}

export async function deleteTask(id: string): Promise<void> {
  await db.tasks.delete(id);
}

export async function getDayInput(date: string): Promise<DayInput | undefined> {
  return await db.dayInputs.get(date);
}

export async function saveDayInput(input: DayInput): Promise<void> {
  await db.dayInputs.put(input);
}

export async function getPlanResult(date: string): Promise<PlanResult | undefined> {
  // Due to our schema design, we store PlanResult keyed by the date it was applied for.
  // Wait, PlanResultSchema doesn't have an ID. We need to save it associated with the DayInput date.
  return await db.planResults.get({ date });
}

export async function savePlanResult(date: string, result: PlanResult): Promise<void> {
  // Add date key dynamically for IndexedDB storage
  await db.planResults.put({ ...result, date } as PlanResult & { date: string });
}

export async function getPostponedInfo(taskId: string): Promise<PostponedInfo | undefined> {
  return await db.postponed.get(taskId);
}

export async function savePostponedInfo(info: PostponedInfo): Promise<void> {
  await db.postponed.put(info);
}

export async function getPostponedTasksForToday(): Promise<Task[]> {
  const today = getTodayDateString();
  const infos = await db.postponed.where('postponedDate').equals(today).toArray();
  const taskIds = infos.map(i => i.taskId);
  if (taskIds.length === 0) return [];
  const tasks = await db.tasks.bulkGet(taskIds);
  return tasks.filter((t): t is Task => t !== undefined);
}

export async function getAllPostponedTasks(): Promise<Task[]> {
  const infos = await db.postponed.toArray();
  const taskIds = infos.map(i => i.taskId);
  if (taskIds.length === 0) return [];
  const tasks = await db.tasks.bulkGet(taskIds);
  return tasks.filter((t): t is Task => t !== undefined && t.status === 'incomplete');
}
