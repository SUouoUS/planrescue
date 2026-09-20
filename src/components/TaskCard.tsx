"use client"

import React, { useState } from 'react';
import { Task, TaskDecision } from '@/domain/types';
import { formatDuration } from '@/domain/time-calc';

interface TaskCardProps {
  task: Task;
  decision?: TaskDecision;
  isMustToday: boolean;
  onEdit: () => void;
  onComplete: () => void;
}

const ACTION_STYLES: Record<string, { label: string; labelClass: string; borderClass: string }> = {
  KEEP: {
    label: '그대로 진행',
    labelClass: 'text-[var(--status-keep)] bg-[var(--status-keep-bg)]',
    borderClass: 'border-l-[var(--status-keep)]',
  },
  REDUCE: {
    label: '오늘은 여기까지',
    labelClass: 'text-[var(--status-reduce)] bg-[var(--status-reduce-bg)]',
    borderClass: 'border-l-[var(--status-reduce)]',
  },
  POSTPONE: {
    label: '나중에 할 일',
    labelClass: 'text-[var(--status-postpone)] bg-[var(--status-postpone-bg)]',
    borderClass: 'border-l-[var(--status-postpone)]',
  },
  DROP: {
    label: '오늘은 제외',
    labelClass: 'text-[var(--status-drop)] bg-[var(--status-drop-bg)]',
    borderClass: 'border-l-[var(--status-drop)]',
  },
};

export function TaskCard({ task, decision, isMustToday, onEdit, onComplete }: TaskCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const actionStyle = decision?.action ? ACTION_STYLES[decision.action] : null;

  return (
    <div className="border-b border-border last:border-b-0 py-4 group">
      {/* Row 1: checkbox, title, must-today label, actions */}
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          onClick={onComplete}
          className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-sm border border-input hover:border-accent transition-colors flex items-center justify-center"
          aria-label={`${task.title} 완료`}
          title="완료 처리"
        >
          {task.status === 'completed' && (
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Title area */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[15px] font-medium leading-snug break-words ${task.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground hover:text-accent transition-colors'}`}>
              {task.title}
            </span>
            {isMustToday && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-[var(--status-error-bg)] text-[var(--status-error)]">
                오늘 필수
              </span>
            )}
            {task.blocked && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-secondary text-muted-foreground">
                답변 대기
              </span>
            )}
          </div>

          {/* Row 2: metadata */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {task.estimatedMinutes && (
              <span className="tabular-nums">{formatDuration(task.estimatedMinutes)}</span>
            )}
            {task.deadline && (
              <span className="tabular-nums">
                마감 {new Date(task.deadline).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Decision result (if exists) */}
      {decision && actionStyle && (
        <div className="mt-3 ml-[30px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 text-[12px] font-semibold rounded ${actionStyle.labelClass}`}>
              {actionStyle.label}
            </span>
            <span className="text-xs text-muted-foreground">{decision.reasonText}</span>
          </div>

          {/* REDUCE detail */}
          {decision.action === 'REDUCE' && decision.appliedScope && (
            <div className="mt-2 py-2 px-3 rounded-md bg-[var(--status-reduce-bg)] text-sm border-l-2 border-[var(--status-reduce)]">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-semibold text-[var(--status-reduce)]">최소 범위</span>
                <span className="text-[13px] text-foreground font-medium">{decision.appliedScope}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                원래 {formatDuration(task.estimatedMinutes!)} → <span className="font-medium text-foreground">{formatDuration(decision.appliedMinutes!)}</span>만 진행
              </div>
              {task.reduction?.doneCriteria && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="mt-2 text-xs text-accent hover:text-foreground transition-colors underline underline-offset-2"
                >
                  {showDetails ? '완료 기준 숨기기' : '완료 기준 보기'}
                </button>
              )}
              {showDetails && task.reduction?.doneCriteria && (
                <p className="mt-1.5 text-xs text-muted-foreground bg-background/50 p-2 rounded">{task.reduction.doneCriteria}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
