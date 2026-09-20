"use client"

import React, { useState } from 'react';
import { Task, TaskDecision, UserOverride } from '@/domain/types';
import { Button } from './ui/button';
import { formatDuration } from '@/domain/time-calc';

interface TaskCardProps {
  task: Task;
  decision?: TaskDecision;
  userOverride: UserOverride;
  isMustToday: boolean;
  onOverrideChange: (override: UserOverride) => void;
  onEdit: () => void;
  onComplete: () => void;
}

interface AiSuggestion {
  needsClarification?: boolean;
  question?: string;
  suggestedScope?: string;
  rationale?: string;
  doneCriteria?: string;
  error?: string;
}

const ACTION_STYLES: Record<string, { label: string; labelClass: string; borderClass: string }> = {
  KEEP: {
    label: '그대로',
    labelClass: 'text-[var(--status-keep)] bg-[var(--status-keep-bg)]',
    borderClass: 'border-l-[var(--status-keep)]',
  },
  REDUCE: {
    label: '범위 축소',
    labelClass: 'text-[var(--status-reduce)] bg-[var(--status-reduce-bg)]',
    borderClass: 'border-l-[var(--status-reduce)]',
  },
  POSTPONE: {
    label: '미루기',
    labelClass: 'text-[var(--status-postpone)] bg-[var(--status-postpone-bg)]',
    borderClass: 'border-l-[var(--status-postpone)]',
  },
  DROP: {
    label: '오늘 제외',
    labelClass: 'text-[var(--status-drop)] bg-[var(--status-drop-bg)]',
    borderClass: 'border-l-[var(--status-drop)]',
  },
};

export function TaskCard({ task, decision, userOverride, isMustToday, onOverrideChange, onEdit, onComplete }: TaskCardProps) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const actionStyle = decision?.action ? ACTION_STYLES[decision.action] : null;

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    setAiSuggestion(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: task.id,
          title: task.title,
          notes: task.notes,
          estimatedMinutes: task.estimatedMinutes,
          deadline: task.deadline,
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiSuggestion(data);
      } else {
        alert(data.error || 'AI 제안 실패');
      }
    } catch {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="border-b border-border last:border-b-0 py-3 group">
      {/* Row 1: checkbox, title, must-today label, actions */}
      <div className="flex items-start gap-3">
        {/* Complete checkbox */}
        <button
          onClick={onComplete}
          className="mt-0.5 flex-shrink-0 w-[18px] h-[18px] rounded-sm border border-input hover:border-accent transition-colors duration-150 flex items-center justify-center"
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-medium leading-snug break-words">{task.title}</span>
            {isMustToday && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-[var(--status-error-bg)] text-[var(--status-error)]">
                오늘 필수
              </span>
            )}
            {task.blocked && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded bg-secondary text-muted-foreground">
                외부 대기
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
            {task.importance !== 'medium' && (
              <span>중요도 {task.importance === 'high' ? '높음' : '낮음'}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors duration-150"
          >
            수정
          </button>
        </div>
      </div>

      {/* Decision result (if exists) */}
      {decision && actionStyle && (
        <div className="mt-2 ml-[30px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 text-[11px] font-medium rounded ${actionStyle.labelClass}`}>
              {actionStyle.label}
            </span>
            <span className="text-xs text-muted-foreground">{decision.reasonText}</span>
          </div>

          {/* REDUCE detail */}
          {decision.action === 'REDUCE' && decision.appliedScope && (
            <div className="mt-2 py-2 px-3 rounded-md bg-[var(--status-reduce-bg)] text-sm">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-xs font-medium text-[var(--status-reduce)]">최소 범위</span>
                <span className="text-[13px] text-foreground">{decision.appliedScope}</span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                {formatDuration(task.estimatedMinutes!)} → {formatDuration(decision.appliedMinutes!)}
              </div>
              {task.reduction?.doneCriteria && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="mt-1 text-xs text-accent hover:text-foreground transition-colors duration-150"
                >
                  {showDetails ? '완료 기준 접기' : '완료 기준 보기'}
                </button>
              )}
              {showDetails && task.reduction?.doneCriteria && (
                <p className="mt-1 text-xs text-muted-foreground">{task.reduction.doneCriteria}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Override & AI */}
      <div className="mt-2 ml-[30px] flex flex-wrap items-center gap-2">
        <label htmlFor={`override-${task.id}`} className="text-xs text-muted-foreground">강제 지정</label>
        <select
          id={`override-${task.id}`}
          className="text-xs border border-input bg-background rounded-md px-2 py-1 h-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
          value={userOverride}
          onChange={e => onOverrideChange(e.target.value as UserOverride)}
        >
          <option value="AUTO">자동</option>
          <option value="KEEP">그대로</option>
          <option value="REDUCE">범위 축소</option>
          <option value="POSTPONE">미루기</option>
          <option value="DROP">오늘 제외</option>
        </select>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs ml-auto text-muted-foreground hover:text-foreground"
          onClick={handleAiSuggest}
          disabled={loadingAi}
        >
          {loadingAi ? '생성 중...' : '최소 범위 제안받기'}
        </Button>
      </div>

      {/* AI suggestion */}
      {aiSuggestion && (
        <div className="mt-2 ml-[30px] p-3 rounded-md bg-secondary text-sm">
          {aiSuggestion.needsClarification ? (
            <div>
              <p className="font-medium text-sm">정보가 부족합니다.</p>
              <p className="text-xs mt-1 text-muted-foreground">{aiSuggestion.question}</p>
            </div>
          ) : (
            <div>
              <p className="font-medium text-sm">AI 제안 최소 범위</p>
              <p className="text-[13px] mt-1">{aiSuggestion.suggestedScope}</p>
              <p className="text-xs mt-1 text-muted-foreground">이유: {aiSuggestion.rationale}</p>
              <p className="text-xs text-muted-foreground">완료 기준: {aiSuggestion.doneCriteria}</p>
              <Button variant="outline" size="sm" className="w-full mt-2 h-8 text-xs">
                이 제안 채택하기 (작업 수정으로 이동)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
