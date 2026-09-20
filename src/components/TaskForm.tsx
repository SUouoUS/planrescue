"use client"

import React, { useState } from 'react';
import { Task, TaskSchema, ImportanceLevel, TeamImpact } from '@/domain/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { generateId } from '@/domain/time-calc';

interface TaskFormProps {
  initialTask?: Task;
  onSave: (task: Task) => void;
  onCancel: () => void;
}

export function TaskForm({ initialTask, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(initialTask?.title ?? '');
  const [estimatedMinutes, setEstimatedMinutes] = useState(initialTask?.estimatedMinutes?.toString() ?? '');
  const [importance, setImportance] = useState<ImportanceLevel>(initialTask?.importance ?? 'medium');
  const [expanded, setExpanded] = useState(false);
  
  // Expanded fields
  const [notes, setNotes] = useState(initialTask?.notes ?? '');
  const [deadline, setDeadline] = useState(initialTask?.deadline ? new Date(initialTask.deadline).toISOString().slice(0, 16) : '');
  const [teamImpact, setTeamImpact] = useState<TeamImpact>(initialTask?.teamImpact ?? 'none');
  const [blocked, setBlocked] = useState(initialTask?.blocked ?? false);
  const [blockedReason, setBlockedReason] = useState(initialTask?.blockedReason ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});

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
      reduction: initialTask?.reduction ?? null,
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

    onSave(parseResult.data);
  };

  return (
    <div className="border border-border bg-secondary/40 rounded-lg p-4 mb-2">
      <form onSubmit={handleSubmit}>
        {/* Quick entry: title + time side by side */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="task-title" className="text-xs text-muted-foreground">
              할 일 제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="예: 보고서 작성"
              className="h-10"
              autoFocus
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>
          <div className="w-[120px] space-y-1.5">
            <Label htmlFor="task-minutes" className="text-xs text-muted-foreground">예상 시간 (분)</Label>
            <Input
              id="task-minutes"
              type="number"
              min="1"
              value={estimatedMinutes}
              onChange={e => setEstimatedMinutes(e.target.value)}
              placeholder="60"
              className="h-10 tabular-nums"
            />
            {errors.estimatedMinutes && <p className="text-xs text-destructive">{errors.estimatedMinutes}</p>}
          </div>
          <div className="w-[100px] space-y-1.5">
            <Label htmlFor="task-importance" className="text-xs text-muted-foreground">중요도</Label>
            <select
              id="task-importance"
              className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
              value={importance}
              onChange={e => setImportance(e.target.value as ImportanceLevel)}
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
        </div>

        {/* Expandable details */}
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 mb-3"
          >
            + 상세 정보 (마감, 대기 상태 등)
          </button>
        ) : (
          <div className="space-y-3 pt-3 border-t border-border mb-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-deadline" className="text-xs text-muted-foreground">마감 일시 (선택)</Label>
              <Input
                id="task-deadline"
                type="datetime-local"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="task-team" className="text-xs text-muted-foreground">팀 영향도</Label>
                <select
                  id="task-team"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
                  value={teamImpact}
                  onChange={e => setTeamImpact(e.target.value as TeamImpact)}
                >
                  <option value="none">없음</option>
                  <option value="low">낮음</option>
                  <option value="high">높음</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="task-blocked"
                  checked={blocked}
                  onChange={e => setBlocked(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="task-blocked" className="text-sm">외부 답변/결과 대기 중</Label>
              </div>
              {blocked && (
                <Input
                  value={blockedReason}
                  onChange={e => setBlockedReason(e.target.value)}
                  placeholder="대기 사유 (예: 디자인팀 에셋 전달 대기)"
                  className="h-10"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-notes" className="text-xs text-muted-foreground">메모</Label>
              <Input
                id="task-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="추가 정보"
                className="h-10"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-9">취소</Button>
          <Button type="submit" size="sm" className="h-9">저장</Button>
        </div>
      </form>
    </div>
  );
}
