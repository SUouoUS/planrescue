import { db } from './db';
import { BackupSchema, type BackupData, type Task, type DayInput, type PlanResult } from '../../domain/types';

export async function exportBackup(): Promise<string> {
  const tasks = await db.tasks.toArray();
  const dayInputs = await db.dayInputs.toArray();
  const appliedPlans = await db.planResults.toArray();

  const backup: BackupData = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    tasks,
    dayInputs,
    appliedPlans,
  };

  return JSON.stringify(backup, null, 2);
}

export async function importBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    const backup = BackupSchema.parse(parsed);

    // Atomically replace all data
    await db.transaction('rw', db.tasks, db.dayInputs, db.planResults, db.postponed, async () => {
      await db.tasks.clear();
      await db.dayInputs.clear();
      await db.planResults.clear();
      await db.postponed.clear();

      if (backup.tasks.length > 0) {
        await db.tasks.bulkAdd(backup.tasks);
      }
      if (backup.dayInputs.length > 0) {
        await db.dayInputs.bulkAdd(backup.dayInputs);
      }
      if (backup.appliedPlans.length > 0) {
        // Ensure planResults have a 'date' key as our Dexie schema expects
        // Here we try to extract date from referenceTime or just use a fallback if not present,
        // but in our DB save, we added 'date' dynamically. We need to handle this.
        const plansToStore = backup.appliedPlans.map(p => {
          // If 'date' is missing, fallback to current date. In a real scenario we'd want to store it in schema.
          // Since it's missing from PlanResultSchema, let's infer it from referenceTime.
          const date = new Date(p.referenceTime).toISOString().split('T')[0];
          return { ...p, date };
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await db.planResults.bulkAdd(plansToStore as any);
      }
    });

    return true;
  } catch (error) {
    console.error('Backup import failed:', error);
    return false;
  }
}
