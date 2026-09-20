"use client"

import React, { useState } from 'react';
import { usePlanRescue } from '@/hooks/usePlanRescue';
import { formatDuration } from '@/domain/time-calc';
import { Task } from '@/domain/types';

export default function TasksPage() {
  const { isLoaded, tasks, handleSaveTask } = usePlanRescue();
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'completed'>('incomplete');

  if (!isLoaded) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">로딩 중...</div>;
  }

  const filteredTasks = tasks.filter(t => {
    if (filter === 'incomplete') return t.status === 'incomplete';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleToggleComplete = async (task: Task) => {
    const updated: Task = { 
      ...task, 
      status: task.status === 'completed' ? 'incomplete' : 'completed'
    };
    await handleSaveTask(updated);
  };

  return (
    <div className="max-w-[800px] mx-auto px-4 py-8 md:py-12 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">할 일 관리</h1>
          <p className="text-sm text-muted-foreground">모든 업무의 상태와 속성을 확인하고 관리하세요.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="incomplete">미완료 업무</option>
            <option value="completed">완료된 업무</option>
            <option value="all">모든 업무</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            해당하는 업무가 없습니다.
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card">
              <button
                onClick={() => handleToggleComplete(task)}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-sm border transition-colors flex items-center justify-center ${task.status === 'completed' ? 'bg-primary border-primary text-primary-foreground' : 'border-input hover:border-accent'}`}
              >
                {task.status === 'completed' && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[15px] font-medium leading-snug break-words ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                  {task.blocked && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-secondary text-muted-foreground">
                      대기 중
                    </span>
                  )}
                  {task.importance === 'high' && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded border border-border text-foreground">
                      중요
                    </span>
                  )}
                </div>
                
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {task.estimatedMinutes && (
                    <span className="tabular-nums">예상 {formatDuration(task.estimatedMinutes)}</span>
                  )}
                  {task.deadline && (
                    <span className="tabular-nums">
                      마감 {new Date(task.deadline).toLocaleDateString('ko-KR')} {new Date(task.deadline).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
