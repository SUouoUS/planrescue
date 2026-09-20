"use client"

import { useState, useEffect, useCallback } from 'react';
import { 
  Task, DayInput, PlanResult 
} from '../domain/types';
import * as repo from '../lib/storage/db';
import { generatePlan } from '../domain/engine';
import { getTodayDateString } from '../domain/time-calc';

export function usePlanRescue() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dayInput, setDayInput] = useState<DayInput | null>(null);
  const [planResult, setPlanResult] = useState<PlanResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load initial data
  useEffect(() => {
    async function load() {
      const today = getTodayDateString();
      const allTasks = await repo.getActiveTasks();
      setTasks(allTasks);

      let todayInput = await repo.getDayInput(today);
      if (!todayInput) {
        todayInput = {
          date: today,
          timezone: 'Asia/Seoul',
          startAt: '09:00',
          endAt: '18:00',
          remainingBudgetMinutes: 480,
          fixedSchedules: [],
          selectedTaskIds: allTasks.map(t => t.id),
          mustTodayTaskIds: [],
          dropAllowedTaskIds: [],
          manualOrder: [],
          userOverrides: {}
        };
        await repo.saveDayInput(todayInput);
      }
      setDayInput(todayInput);

      const savedPlan = await repo.getPlanResult(today);
      if (savedPlan) {
        setPlanResult(savedPlan);
      }
      setIsLoaded(true);
    }
    load();
  }, []);

  // Save task
  const handleSaveTask = useCallback(async (task: Task) => {
    await repo.saveTask(task);
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = task;
        return next;
      }
      return [...prev, task];
    });
    // Add to today's selection if new
    if (dayInput && !dayInput.selectedTaskIds.includes(task.id)) {
      const updatedDayInput = {
        ...dayInput,
        selectedTaskIds: [...dayInput.selectedTaskIds, task.id]
      };
      await repo.saveDayInput(updatedDayInput);
      setDayInput(updatedDayInput);
    }
  }, [dayInput]);

  // Update Day Input
  const handleUpdateDayInput = useCallback(async (updates: Partial<DayInput>) => {
    if (!dayInput) return;
    const next = { ...dayInput, ...updates };
    await repo.saveDayInput(next);
    setDayInput(next);
  }, [dayInput]);

  // Generate Plan
  const handleGeneratePlan = useCallback(async () => {
    if (!dayInput) return;
    const rev = (planResult?.inputRevision ?? 0) + 1;
    const now = new Date(); // In real app, might want to inject for testing
    const result = generatePlan(tasks, dayInput, rev, now);
    setPlanResult(result);
    // Note: We don't save to DB until user clicks "Apply Plan"
  }, [tasks, dayInput, planResult]);

  // Apply Plan
  const handleApplyPlan = useCallback(async () => {
    if (!planResult || !dayInput) return;
    const applied = { ...planResult, isPreview: false };
    await repo.savePlanResult(dayInput.date, applied);
    setPlanResult(applied);
  }, [planResult, dayInput]);

  return {
    isLoaded,
    tasks,
    dayInput,
    planResult,
    handleSaveTask,
    handleUpdateDayInput,
    handleGeneratePlan,
    handleApplyPlan,
  };
}
