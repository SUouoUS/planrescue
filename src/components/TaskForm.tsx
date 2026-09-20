"use client"

import React, { useState } from 'react';
import { Task, TaskSchema, ImportanceLevel, TeamImpact } from '@/domain/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
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
    <Card className="w-full mb-4">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">할 일 제목 <span className="text-destructive">*</span></Label>
            <Input 
              id="title" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="예: 보고서 작성"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">예상 소요시간 (분)</Label>
              <Input 
                id="estimatedMinutes" 
                type="number" 
                min="1" 
                value={estimatedMinutes} 
                onChange={e => setEstimatedMinutes(e.target.value)} 
                placeholder="60"
              />
              {errors.estimatedMinutes && <p className="text-sm text-destructive">{errors.estimatedMinutes}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="importance">중요도</Label>
              <select 
                id="importance"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={importance}
                onChange={e => setImportance(e.target.value as ImportanceLevel)}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>

          {!expanded ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(true)} className="w-full text-muted-foreground">
              + 상세 정보 입력 (마감, 대기 상태 등)
            </Button>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="deadline">마감 일시 (선택)</Label>
                <Input 
                  id="deadline" 
                  type="datetime-local" 
                  value={deadline} 
                  onChange={e => setDeadline(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teamImpact">팀 영향도</Label>
                  <select 
                    id="teamImpact"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={teamImpact}
                    onChange={e => setTeamImpact(e.target.value as TeamImpact)}
                  >
                    <option value="none">없음</option>
                    <option value="low">낮음</option>
                    <option value="high">높음</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="blocked" 
                    checked={blocked} 
                    onChange={e => setBlocked(e.target.checked)} 
                  />
                  <Label htmlFor="blocked">외부 답변/결과 대기 중</Label>
                </div>
                {blocked && (
                  <Input 
                    value={blockedReason} 
                    onChange={e => setBlockedReason(e.target.value)} 
                    placeholder="대기 사유 (예: 디자인팀 에셋 전달 대기)"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">메모</Label>
                <Input 
                  id="notes" 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  placeholder="추가 정보"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
