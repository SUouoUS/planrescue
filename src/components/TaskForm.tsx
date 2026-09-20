"use client"

import React, { useState } from 'react';
import { Task, TaskSchema, ImportanceLevel, TeamImpact, UserOverride } from '@/domain/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { generateId } from '@/domain/time-calc';

interface TaskFormProps {
  initialTask?: Task;
  initialOverride?: UserOverride;
  initialMustToday?: boolean;
  onSave: (task: Task, override?: UserOverride, mustToday?: boolean) => void;
  onCancel: () => void;
}

export function TaskForm({ initialTask, initialOverride = 'AUTO', initialMustToday = false, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialTask?.estimatedMinutes?.toString() ?? '');
  const [importance, setImportance] = useState<ImportanceLevel>(initialTask?.importance ?? 'medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Expanded fields
  const [deadline, setDeadline] = useState(initialTask?.deadline ? new Date(initialTask.deadline).toISOString().slice(0, 16) : '');
  const [teamImpact, setTeamImpact] = useState<TeamImpact>(initialTask?.teamImpact ?? 'none');
  const [blocked, setBlocked] = useState(initialTask?.blocked ?? false);
  const [blockedReason, setBlockedReason] = useState(initialTask?.blockedReason ?? '');
  const [notes, setNotes] = useState(initialTask?.notes ?? '');
  
  // Day-specific settings (Overrides & Must Today)
  const [mustToday, setMustToday] = useState(initialMustToday);
  const [userOverride, setUserOverride] = useState<UserOverride>(initialOverride);
  
  // AI Suggestion
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAiSuggest = async () => {
    setLoadingAi(true);
    setAiSuggestion(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: initialTask?.id || 'new',
          title,
          notes,
          estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
          deadline,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTask: Task = {
      id: initialTask?.id ?? generateId(),
      title,
      notes: notes || null,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      importance,
      teamImpact,
      blocked,
      blockedReason: blocked && blockedReason ? blockedReason : null,
      reduction: initialTask?.reduction ?? null, // Keep existing reduction criteria if any
      status: initialTask?.status ?? 'incomplete',
      createdAt: initialTask?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const parseResult = TaskSchema.safeParse(newTask);
    if (!parseResult.success) {
      const formErrors: Record<string, string> = {};
      parseResult.error.issues.forEach(err => {
        if (err.path.length > 0) {
          formErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(formErrors);
      return;
    }

    onSave(parseResult.data, userOverride, mustToday);
  };

  return (
    <div className="border border-border bg-secondary/20 rounded-lg p-5 mb-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title" className="text-sm font-medium">할 일 제목 <span className="text-destructive">*</span></Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="무엇을 해야 하나요?"
              className="h-11 text-sm bg-background"
              autoFocus
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="task-minutes" className="text-sm font-medium">예상 시간 (분)</Label>
              <Input
                id="task-minutes"
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value)}
                placeholder="예: 60"
                className="h-11 tabular-nums bg-background"
              />
              {errors.estimatedMinutes && <p className="text-xs text-destructive">{errors.estimatedMinutes}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-importance" className="text-sm font-medium">중요도</Label>
              <select
                id="task-importance"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                value={importance}
                onChange={e => setImportance(e.target.value as ImportanceLevel)}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>
        </div>

        {!showAdvanced ? (
          <div className="mt-4 pt-4 border-t border-border flex justify-center">
            <button
              type="button"
              onClick={() => setShowAdvanced(true)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              + 세부 설정 (마감, 대기 상태, 강제 지정, AI 제안 등)
            </button>
          </div>
        ) : (
          <div className="mt-6 pt-5 border-t border-border space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">세부 설정</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="task-deadline" className="text-xs font-medium text-muted-foreground">마감 일시</Label>
                  <Input
                    id="task-deadline"
                    type="datetime-local"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="h-10 text-sm bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="task-team" className="text-xs font-medium text-muted-foreground">팀 영향도</Label>
                  <select
                    id="task-team"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                    value={teamImpact}
                    onChange={e => setTeamImpact(e.target.value as TeamImpact)}
                  >
                    <option value="none">없음</option>
                    <option value="low">낮음</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border border-dashed">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="task-must-today"
                    checked={mustToday}
                    onChange={e => setMustToday(e.target.checked)}
                    className="rounded border-input w-4 h-4"
                  />
                  <Label htmlFor="task-must-today" className="text-sm font-medium">오늘 반드시 해야 함</Label>
                </div>
                {mustToday && (
                  <div className="pl-6 text-xs text-muted-foreground bg-secondary/30 p-2 rounded-md">
                    필수 업무는 자동으로 미루지 않아요. 시간이 부족하면 최소 범위를 정하거나 가능한 시간을 조정해 주세요.
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="task-blocked"
                    checked={blocked}
                    onChange={e => setBlocked(e.target.checked)}
                    className="rounded border-input w-4 h-4"
                  />
                  <Label htmlFor="task-blocked" className="text-sm font-medium">외부 답변/결과 대기 중</Label>
                </div>
                {blocked && (
                  <div className="pl-6 space-y-2">
                    <Input
                      value={blockedReason}
                      onChange={e => setBlockedReason(e.target.value)}
                      placeholder="대기 사유 (예: 디자인팀 에셋 전달 대기)"
                      className="h-9 text-sm bg-background"
                    />
                    <p className="text-xs text-muted-foreground">대기 중인 업무는 시간이 부족할 때 우선적으로 미뤄집니다.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border border-dashed">
              <div className="space-y-1.5">
                <Label htmlFor="task-override" className="text-sm font-medium">이 업무의 처리 방식 직접 정하기</Label>
                <select
                  id="task-override"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
                  value={userOverride}
                  onChange={e => setUserOverride(e.target.value as UserOverride)}
                >
                  <option value="AUTO">자동 (시스템이 남은 시간에 맞춰 판단)</option>
                  <option value="KEEP">그대로 하기 (원래 계획대로 오늘 진행)</option>
                  <option value="REDUCE">범위 줄이기 (최소 성공 목표까지만 진행)</option>
                  <option value="POSTPONE">미루기 (오늘 일정에서 빼고 나중에 다시 정리)</option>
                  <option value="DROP">오늘 제외 (오늘은 하지 않음)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="task-notes" className="text-sm font-medium">메모</Label>
                <Input
                  id="task-notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="추가 설명이나 관련 링크"
                  className="h-10 text-sm bg-background"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border border-dashed space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">AI가 최소 범위 제안하기</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiSuggest}
                  disabled={loadingAi || !title}
                  className="text-xs"
                >
                  {loadingAi ? '생성 중...' : '제안받기'}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                * 업무 내용 일부가 Gemini에 전송됩니다.
              </p>

              {aiSuggestion && (
                <div className="mt-2 p-3 rounded-md bg-secondary text-sm">
                  {aiSuggestion.needsClarification ? (
                    <div>
                      <p className="font-medium text-sm">정보가 더 필요해요</p>
                      <p className="text-xs mt-1 text-muted-foreground">{aiSuggestion.question}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-sm text-[var(--status-reduce)]">AI 제안 최소 범위</p>
                      <p className="text-[13px] mt-1">{aiSuggestion.suggestedScope}</p>
                      <p className="text-xs mt-2 text-muted-foreground">이유: {aiSuggestion.rationale}</p>
                      <p className="text-xs text-muted-foreground">완료 기준: {aiSuggestion.doneCriteria}</p>
                      <p className="text-[11px] mt-2 text-muted-foreground">* 제안된 내용은 아직 저장되지 않았습니다. 적용하려면 폼을 저장하세요.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onCancel} className="h-10 px-5">취소</Button>
          <Button type="submit" className="h-10 px-6 font-medium">저장</Button>
        </div>
      </form>
    </div>
  );
}
