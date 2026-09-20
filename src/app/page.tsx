"use client"

import React, { useState } from 'react';
import { usePlanRescue } from '@/hooks/usePlanRescue';
import { TaskForm } from '@/components/TaskForm';
import { TaskCard } from '@/components/TaskCard';
import { Timeline } from '@/components/Timeline';
import { DaySettingsPanel } from '@/components/DaySettingsPanel';
import { PlanResultPanel } from '@/components/PlanResultPanel';
import { Button } from '@/components/ui/button';
import { formatKoreanDate } from '@/domain/time-calc';
import { Task, UserOverride } from '@/domain/types';

export default function Home() {
  const {
    isLoaded,
    tasks,
    dayInput,
    planResult,
    handleSaveTask,
    handleUpdateDayInput,
    handleGeneratePlan,
    handleApplyPlan,
  } = usePlanRescue();

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);

  if (!isLoaded) {
    return <div className="p-8 text-center text-muted-foreground">데이터 불러오는 중...</div>;
  }

  const activeTasks = tasks.filter(t => t.status === 'incomplete');
  const selectedTasks = activeTasks.filter(t => dayInput?.selectedTaskIds.includes(t.id));

  // Determine unplaced/postponed tasks to show separately
  const decidedTaskIds = planResult ? new Set(planResult.decisions.map(d => d.taskId)) : new Set();
  const unplacedTasks = activeTasks.filter(t => 
    (planResult && decidedTaskIds.has(t.id) && planResult.decisions.find(d => d.taskId === t.id)?.action === 'POSTPONE') ||
    (planResult && decidedTaskIds.has(t.id) && planResult.decisions.find(d => d.taskId === t.id)?.action === 'DROP') ||
    (planResult && decidedTaskIds.has(t.id) && planResult.decisions.find(d => d.taskId === t.id)?.action === null)
  );

  const getTaskTitle = (id: string) => tasks.find(t => t.id === id)?.title || '알 수 없음';

  const handleEditClick = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskComplete = async (task: Task) => {
    const updated = { ...task, status: 'completed' as const };
    await handleSaveTask(updated);
  };



  const handleOverrideChange = (taskId: string, override: UserOverride) => {
    if (!dayInput) return;
    const nextOverrides = { ...dayInput.userOverrides, [taskId]: override };
    handleUpdateDayInput({ userOverrides: nextOverrides });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 min-h-screen">
      <header className="mb-8 flex justify-between items-end border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">PlanRescue</h1>
          <p className="text-muted-foreground mt-1">틀어진 계획을 남은 시간에 맞게 재조정하세요.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium">{formatKoreanDate()}</p>
        </div>
      </header>

      {dayInput && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input and Tasks (col-span-7) */}
          <div className="lg:col-span-7 space-y-6">
            <DaySettingsPanel dayInput={dayInput} onChange={handleUpdateDayInput} />
            
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">오늘 할 일</h2>
              <Button onClick={() => { setEditingTask(undefined); setShowTaskForm(true); }}>
                + 할 일 추가
              </Button>
            </div>

            {showTaskForm && (
              <TaskForm 
                initialTask={editingTask}
                onSave={(t) => { handleSaveTask(t); setShowTaskForm(false); setEditingTask(undefined); }} 
                onCancel={() => { setShowTaskForm(false); setEditingTask(undefined); }} 
              />
            )}

            <div className="space-y-3">
              {selectedTasks.length === 0 && !showTaskForm && (
                <div className="p-8 text-center bg-slate-50 border rounded-lg border-dashed">
                  <p className="text-muted-foreground mb-4">오늘 진행할 할 일이 없습니다.</p>
                  <Button variant="outline" onClick={() => setShowTaskForm(true)}>할 일 추가하기</Button>
                </div>
              )}
              
              {selectedTasks.map(task => {
                const decision = planResult?.decisions.find(d => d.taskId === task.id);
                const isMustToday = dayInput.mustTodayTaskIds.includes(task.id);
                const userOverride = dayInput.userOverrides[task.id] || 'AUTO';

                // Skip showing in this list if it was postponed/dropped in the plan result, 
                // it will show in the "Postponed" section below.
                if (planResult && (decision?.action === 'POSTPONE' || decision?.action === 'DROP' || decision?.action === null)) {
                  return null;
                }

                return (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    decision={decision}
                    userOverride={userOverride}
                    isMustToday={isMustToday}
                    onOverrideChange={(val) => handleOverrideChange(task.id, val)}
                    onEdit={() => handleEditClick(task)}
                    onComplete={() => handleTaskComplete(task)}
                  />
                );
              })}
            </div>

            {unplacedTasks.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-muted-foreground mb-3 border-t pt-6">미뤄지거나 제외된 할 일</h3>
                <div className="space-y-3 opacity-75">
                  {unplacedTasks.map(task => {
                    const decision = planResult?.decisions.find(d => d.taskId === task.id);
                    const isMustToday = dayInput.mustTodayTaskIds.includes(task.id);
                    const userOverride = dayInput.userOverrides[task.id] || 'AUTO';
                    return (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        decision={decision}
                        userOverride={userOverride}
                        isMustToday={isMustToday}
                        onOverrideChange={(val) => handleOverrideChange(task.id, val)}
                        onEdit={() => handleEditClick(task)}
                        onComplete={() => handleTaskComplete(task)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Rescue Action and Timeline (col-span-5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-6 space-y-6">
              
              <Button 
                size="lg" 
                className="w-full text-lg h-14 shadow-md hover:shadow-lg transition-all"
                onClick={handleGeneratePlan}
              >
                오늘 계획 복구하기
              </Button>
              
              <PlanResultPanel result={planResult} />
              
              {planResult && planResult.isPreview && (
                <div className="flex gap-2">
                  <Button className="flex-1" variant="default" onClick={handleApplyPlan}>
                    이 계획 적용
                  </Button>
                </div>
              )}

              {planResult && (
                <Timeline 
                  planStartAt={dayInput.startAt}
                  planEndAt={dayInput.endAt}
                  blocks={planResult.scheduleBlocks}
                  fixedSchedules={dayInput.fixedSchedules}
                  getTaskTitle={getTaskTitle}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
