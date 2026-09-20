"use client"

import React, { useState, useEffect } from 'react';
import { usePlanRescue } from '@/hooks/usePlanRescue';
import { TaskForm } from '@/components/TaskForm';
import { TaskCard } from '@/components/TaskCard';
import { Timeline } from '@/components/Timeline';
import { DaySettingsPanel } from '@/components/DaySettingsPanel';
import { PlanResultPanel } from '@/components/PlanResultPanel';
import { OnboardingModal } from '@/components/OnboardingModal';
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const hasOnboarded = localStorage.getItem('planrescue_onboarded');
    if (!hasOnboarded) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem('planrescue_onboarded', 'true');
    setShowOnboarding(false);
  };

  const handleAddFirstTask = (title: string, mins: number) => {
    handleSaveTask({
      id: `task-${Date.now()}`,
      title,
      estimatedMinutes: mins,
      status: 'incomplete',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      importance: 'medium',
      teamImpact: 'none',
      blocked: false,
      blockedReason: null,
      notes: null,
      deadline: null,
      reduction: null
    });
  };

  if (!isLoaded || !isClient) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">로딩 중...</div>;
  }

  const activeTasks = tasks.filter(t => t.status === 'incomplete');
  const selectedTasks = activeTasks.filter(t => dayInput?.selectedTaskIds.includes(t.id));

  // Determine unplaced/postponed tasks
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

  const handleSaveForm = (task: Task, override?: UserOverride, mustToday?: boolean) => {
    handleSaveTask(task);
    
    // Update overrides and mustToday in dayInput if needed
    if (dayInput) {
      let overrides = { ...dayInput.userOverrides };
      let mustIds = [...dayInput.mustTodayTaskIds];
      
      if (override) {
        overrides[task.id] = override;
      }
      
      if (mustToday !== undefined) {
        if (mustToday && !mustIds.includes(task.id)) mustIds.push(task.id);
        if (!mustToday && mustIds.includes(task.id)) mustIds = mustIds.filter(id => id !== task.id);
      }
      
      handleUpdateDayInput({
        userOverrides: overrides,
        mustTodayTaskIds: mustIds
      });
    }
    
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const hasTasks = selectedTasks.length > 0;

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 md:py-12 min-h-screen">
      {showOnboarding && (
        <OnboardingModal 
          onComplete={handleOnboardingComplete} 
          dayInput={dayInput}
          onUpdateDayInput={handleUpdateDayInput}
          onAddFirstTask={handleAddFirstTask}
        />
      )}

      {/* Header Area */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">오늘의 계획</h1>
        <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
          <span>{formatKoreanDate()}</span>
          <span>·</span>
          <span>남은 시간에 맞춰 할 일을 정리해요.</span>
        </p>
      </div>

      {dayInput && (
        <div className="space-y-10">
          
          {/* Empty State */}
          {!hasTasks && !showTaskForm && (
            <div className="py-12 md:py-20 flex flex-col items-center justify-center text-center bg-secondary/20 rounded-xl border border-border border-dashed">
              <h2 className="text-lg font-semibold text-foreground mb-2">오늘 할 일을 하나 적어볼까요?</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                예상 시간을 함께 적으면 남은 시간에 맞춰 정리할 수 있어요.
              </p>
              
              {!dayInput.startAt || dayInput.remainingBudgetMinutes === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-xs text-muted-foreground font-medium bg-background px-3 py-1 rounded-full border border-border">먼저 오늘 가능한 시간을 설정해주세요</p>
                  <DaySettingsPanel dayInput={dayInput} onChange={handleUpdateDayInput} />
                </div>
              ) : (
                <Button onClick={() => setShowTaskForm(true)} className="h-11 px-8 text-base shadow-sm">
                  첫 할 일 추가
                </Button>
              )}
            </div>
          )}

          {/* Task Form Modal (Overlay) */}
          {showTaskForm && (
            <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-lg p-1 overflow-y-auto max-h-[90vh]">
                <div className="p-4 border-b border-border mb-2 flex justify-between items-center">
                  <h3 className="font-semibold">{editingTask ? '할 일 수정' : '새 할 일 추가'}</h3>
                  <button onClick={() => { setShowTaskForm(false); setEditingTask(undefined); }} className="text-muted-foreground hover:text-foreground">✕</button>
                </div>
                <div className="px-2 pb-2">
                  <TaskForm 
                    initialTask={editingTask}
                    initialOverride={editingTask ? dayInput.userOverrides[editingTask.id] : 'AUTO'}
                    initialMustToday={editingTask ? dayInput.mustTodayTaskIds.includes(editingTask.id) : false}
                    onSave={handleSaveForm} 
                    onCancel={() => { setShowTaskForm(false); setEditingTask(undefined); }} 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area (When tasks exist) */}
          {hasTasks && (
            <>
              {/* Day Settings Summary */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <DaySettingsPanel dayInput={dayInput} onChange={handleUpdateDayInput} />
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border">
                  <h2 className="text-base font-semibold text-foreground">오늘 할 일</h2>
                  <button 
                    onClick={() => { setEditingTask(undefined); setShowTaskForm(true); }}
                    className="text-sm font-medium text-accent hover:text-foreground transition-colors"
                  >
                    + 할 일 추가
                  </button>
                </div>

                <div className="flex flex-col gap-0">
                  {selectedTasks.map(task => {
                    const decision = planResult?.decisions.find(d => d.taskId === task.id);
                    const isMustToday = dayInput.mustTodayTaskIds.includes(task.id);

                    if (planResult && (decision?.action === 'POSTPONE' || decision?.action === 'DROP' || decision?.action === null)) {
                      return null;
                    }

                    return (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        decision={decision}
                        isMustToday={isMustToday}
                        onEdit={() => handleEditClick(task)}
                        onComplete={() => handleTaskComplete(task)}
                      />
                    );
                  })}
                </div>

                {/* Primary Action */}
                <div className="pt-6 pb-2 text-center">
                  <Button 
                    className="h-12 px-10 text-base font-semibold shadow-sm w-full md:w-auto"
                    onClick={handleGeneratePlan}
                  >
                    {planResult ? '지금부터 다시 정리하기' : '오늘 계획 복구하기'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">모든 일을 다 넣지 않아도 괜찮아요.</p>
                </div>
              </div>

              {/* Unplaced Tasks */}
              {unplacedTasks.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 pb-2 border-b border-border">
                    미뤄지거나 제외된 할 일
                  </h3>
                  <div className="flex flex-col gap-0 opacity-75">
                    {unplacedTasks.map(task => {
                      const decision = planResult?.decisions.find(d => d.taskId === task.id);
                      const isMustToday = dayInput.mustTodayTaskIds.includes(task.id);
                      return (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          decision={decision}
                          isMustToday={isMustToday}
                          onEdit={() => handleEditClick(task)}
                          onComplete={() => handleTaskComplete(task)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Plan Results & Timeline */}
              {planResult && (
                <div className="mt-12 space-y-6 pt-8 border-t-2 border-border border-dashed animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-4">복구 결과</h3>
                    <PlanResultPanel result={planResult} />
                    
                    {planResult.isPreview && (
                      <div className="mt-4 flex justify-end">
                        <Button className="h-11 px-8 font-medium" variant="default" onClick={handleApplyPlan}>
                          이 계획 적용하기
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="pt-6">
                    <h3 className="text-base font-semibold text-foreground mb-6">
                      실행 시간표
                    </h3>
                    <Timeline 
                      planStartAt={dayInput.startAt}
                      planEndAt={dayInput.endAt}
                      blocks={planResult.scheduleBlocks}
                      fixedSchedules={dayInput.fixedSchedules}
                      getTaskTitle={getTaskTitle}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
