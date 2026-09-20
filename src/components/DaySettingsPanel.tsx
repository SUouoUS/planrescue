"use client"

import React, { useState, useEffect } from 'react';
import { DayInput, FixedSchedule } from '@/domain/types';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { parseHHmm, formatDuration, generateId } from '@/domain/time-calc';

interface DaySettingsPanelProps {
  dayInput: DayInput;
  onChange: (updates: Partial<DayInput>) => void;
}

export function DaySettingsPanel({ dayInput, onChange }: DaySettingsPanelProps) {
  const isInitial = dayInput.startAt === '09:00' && dayInput.endAt === '18:00' && dayInput.remainingBudgetMinutes === 480 && dayInput.fixedSchedules.length === 0;
  const [editing, setEditing] = useState(isInitial);

  const [startAt, setStartAt] = useState(dayInput.startAt);
  const [endAt, setEndAt] = useState(dayInput.endAt);
  const [budget, setBudget] = useState(dayInput.remainingBudgetMinutes.toString());
  const [fixedSchedules, setFixedSchedules] = useState<FixedSchedule[]>(dayInput.fixedSchedules);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [newFixedTitle, setNewFixedTitle] = useState('');
  const [newFixedStart, setNewFixedStart] = useState('');
  const [newFixedEnd, setNewFixedEnd] = useState('');

  useEffect(() => {
    setStartAt(dayInput.startAt);
    setEndAt(dayInput.endAt);
    setBudget(dayInput.remainingBudgetMinutes.toString());
    setFixedSchedules(dayInput.fixedSchedules);
  }, [dayInput.startAt, dayInput.endAt, dayInput.remainingBudgetMinutes, dayInput.fixedSchedules]);

  const totalMin = Math.max(0, parseHHmm(endAt) - parseHHmm(startAt));
  const budgetNum = parseInt(budget, 10) || 0;

  const handleApply = () => {
    onChange({
      startAt,
      endAt,
      remainingBudgetMinutes: budgetNum,
      fixedSchedules,
    });
    setEditing(false);
  };

  const handleAddFixed = () => {
    if (!newFixedTitle.trim() || !newFixedStart || !newFixedEnd) return;
    const newSchedule: FixedSchedule = {
      id: generateId(),
      title: newFixedTitle.trim(),
      startAt: newFixedStart,
      endAt: newFixedEnd,
    };
    setFixedSchedules(prev => [...prev, newSchedule]);
    setNewFixedTitle('');
    setNewFixedStart('');
    setNewFixedEnd('');
    setShowFixedForm(false);
  };

  const handleRemoveFixed = (id: string) => {
    setFixedSchedules(prev => prev.filter(s => s.id !== id));
  };

  // Read mode
  if (!editing) {
    return (
      <div className="py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">오늘의 시간</h3>
          <button
            onClick={() => setEditing(true)}
            className="text-sm text-accent hover:text-foreground transition-colors duration-150"
          >
            변경
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[15px]">
          <span className="tabular-nums font-medium">{dayInput.startAt}–{dayInput.endAt}</span>
          <span className="text-muted-foreground">·</span>
          <span>작업 가능 <span className="font-medium">{formatDuration(dayInput.remainingBudgetMinutes)}</span></span>
          <span className="text-muted-foreground">·</span>
          <span>
            고정 일정 <span className="font-medium">{dayInput.fixedSchedules.length}개</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">고정 일정을 제외한 순수 작업 예산</p>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="py-4 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">오늘의 시간</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="space-y-1.5">
          <Label htmlFor="ds-start" className="text-xs text-muted-foreground">시작 시각</Label>
          <Input
            id="ds-start"
            type="time"
            value={startAt}
            onChange={e => setStartAt(e.target.value)}
            className="h-10 text-sm tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-end" className="text-xs text-muted-foreground">종료 시각</Label>
          <Input
            id="ds-end"
            type="time"
            value={endAt}
            onChange={e => setEndAt(e.target.value)}
            className="h-10 text-sm tabular-nums"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ds-budget" className="text-xs text-muted-foreground">작업 가능 시간 (분)</Label>
          <Input
            id="ds-budget"
            type="number"
            min="0"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="h-10 text-sm tabular-nums"
            placeholder="예: 240"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-muted-foreground">
          전체 범위 <span className="font-medium text-foreground tabular-nums">{formatDuration(totalMin)}</span>
          {budgetNum > 0 && (
            <> · 작업 가능 <span className="font-medium text-foreground tabular-nums">{formatDuration(budgetNum)}</span></>
          )}
        </span>
      </div>

      {/* Fixed schedules */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">고정 일정</span>
          <button
            type="button"
            onClick={() => setShowFixedForm(!showFixedForm)}
            className="text-xs text-accent hover:text-foreground transition-colors duration-150"
          >
            {showFixedForm ? '취소' : '+ 추가'}
          </button>
        </div>

        {fixedSchedules.length > 0 && (
          <div className="space-y-1 mb-2">
            {fixedSchedules.map(s => (
              <div key={s.id} className="flex items-center justify-between py-1.5 px-2 text-sm bg-secondary/60 rounded-md">
                <span>
                  <span className="tabular-nums text-muted-foreground">{s.startAt}–{s.endAt}</span>
                  <span className="ml-2">{s.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFixed(s.id)}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors duration-150 px-1"
                  aria-label={`${s.title} 삭제`}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}

        {fixedSchedules.length === 0 && !showFixedForm && (
          <p className="text-xs text-muted-foreground py-1">고정 일정이 없습니다.</p>
        )}

        {showFixedForm && (
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="fixed-title" className="text-xs text-muted-foreground">이름</Label>
              <Input
                id="fixed-title"
                value={newFixedTitle}
                onChange={e => setNewFixedTitle(e.target.value)}
                placeholder="예: 팀 회의"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fixed-start" className="text-xs text-muted-foreground">시작</Label>
              <Input
                id="fixed-start"
                type="time"
                value={newFixedStart}
                onChange={e => setNewFixedStart(e.target.value)}
                className="h-9 text-sm tabular-nums w-[100px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fixed-end" className="text-xs text-muted-foreground">종료</Label>
              <Input
                id="fixed-end"
                type="time"
                value={newFixedEnd}
                onChange={e => setNewFixedEnd(e.target.value)}
                className="h-9 text-sm tabular-nums w-[100px]"
              />
            </div>
            <Button type="button" size="sm" onClick={handleAddFixed} className="h-9">
              추가
            </Button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        작업 가능 시간은 고정 일정을 제외한 순수 작업 예산입니다.
      </p>

      <div className="flex justify-end gap-2">
        {!isInitial && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            취소
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleApply}>
          적용
        </Button>
      </div>
    </div>
  );
}
