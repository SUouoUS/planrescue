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
    return <div className="p-8 text-center text-muted-foreground text-sm">데이터 불러오는 중...</div>;
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
    <div className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 xl:px-10 py-6 min-h-screen">
      {/* Header */}
      <header className="mb-10 flex flex-wrap justify-between items-center gap-4 border-b border-transparent">
        <h1 className="text-[18px] font-bold tracking-tight text-foreground">PlanRescue</h1>
        <div className="text-sm font-medium text-muted-foreground tabular-nums">
          {formatKoreanDate()}
        </div>
      </header>

      {dayInput && (
        <>
          {/* Page Title & Action */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-border">
            <div>
              <h2 className="text-[26px] font-semibold text-foreground mb-2">오늘의 계획</h2>
              <p className="text-sm text-muted-foreground">남은 시간에 맞춰 오늘 할 일을 정리해요.</p>
            </div>
            <div className="w-full md:w-auto md:min-w-[180px]">
              <Button 
                className="w-full h-11 text-[15px]"
                onClick={handleGeneratePlan}
              >
                계획 복구하기
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.38fr)_minmax(320px,1fr)] gap-x-8 lg:gap-x-12 gap-y-10 items-start">
            
            {/* Main Area: Mobile puts DaySettings first, then tasks. Desktop puts tasks left, settings right. 
                Wait, the prompt says: "모바일에서는 시간 설정 → 할 일·결과 → 시간표 순으로 보여주세요."
                Desktop: Left: Tasks, Right: DaySettings & Timeline. */}
            
            {/* Left Column: Tasks */}
            <div className="order-2 xl:order-1 space-y-6">
              
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h2 className="text-base font-semibold text-foreground">오늘 할 일</h2>
                <button 
                  onClick={() => { setEditingTask(undefined); setShowTaskForm(true); }}
                  className="text-sm text-accent hover:text-foreground transition-colors duration-150"
                >
                  + 추가
                </button>
              </div>

              {showTaskForm && (
                <TaskForm 
                  initialTask={editingTask}
                  onSave={(t) => { handleSaveTask(t); setShowTaskForm(false); setEditingTask(undefined); }} 
                  onCancel={() => { setShowTaskForm(false); setEditingTask(undefined); }} 
                />
              )}

              <div className="flex flex-col gap-0">
                {selectedTasks.length === 0 && !showTaskForm && (
                  <div className="py-10 text-center flex flex-col items-center">
                    <p className="text-[15px] font-medium text-foreground mb-1">오늘 할 일을 하나 적어볼까요?</p>
                    <p className="text-sm text-muted-foreground mb-5">예상 시간을 함께 적으면 남은 시간에 맞춰 정리할 수 있어요.</p>
                    <Button variant="outline" size="sm" className="h-9" onClick={() => setShowTaskForm(true)}>할 일 추가하기</Button>
                  </div>
                )}
                
                {selectedTasks.map(task => {
                  const decision = planResult?.decisions.find(d => d.taskId === task.id);
                  const isMustToday = dayInput.mustTodayTaskIds.includes(task.id);
                  const userOverride = dayInput.userOverrides[task.id] || 'AUTO';

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
                <div className="mt-12">
                  <h3 className="text-sm font-semibold text-muted-foreground mb-4 pb-2 border-b border-border">
                    미뤄지거나 제외된 할 일
                  </h3>
                  <div className="flex flex-col gap-0 opacity-80">
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

            {/* Right Column: Day Settings, Results, Timeline */}
            <div className="order-1 xl:order-2 space-y-8">
              
              <DaySettingsPanel dayInput={dayInput} onChange={handleUpdateDayInput} />
              
              <div className="pt-2">
                <PlanResultPanel result={planResult} />
                
                {planResult && planResult.isPreview && (
                  <div className="mb-6">
                    <Button className="w-full h-10" variant="secondary" onClick={handleApplyPlan}>
                      이 계획 적용
                    </Button>
                  </div>
                )}

                <div className="mt-6">
                  <h3 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border">
                    실행 시간표
                  </h3>
                  {planResult ? (
                    <Timeline 
                      planStartAt={dayInput.startAt}
                      planEndAt={dayInput.endAt}
                      blocks={planResult.scheduleBlocks}
                      fixedSchedules={dayInput.fixedSchedules}
                      getTaskTitle={getTaskTitle}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground py-4">계획을 복구하면 이곳에 시간표가 표시돼요.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
}
