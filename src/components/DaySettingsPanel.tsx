"use client"

import React, { useState } from 'react';
import { DayInput } from '@/domain/types';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { parseHHmm, formatDuration } from '@/domain/time-calc';

interface DaySettingsPanelProps {
  dayInput: DayInput;
  onChange: (updates: Partial<DayInput>) => void;
}

export function DaySettingsPanel({ dayInput, onChange }: DaySettingsPanelProps) {
  const [startAt, setStartAt] = useState(dayInput.startAt);
  const [endAt, setEndAt] = useState(dayInput.endAt);
  const [budget, setBudget] = useState(dayInput.remainingBudgetMinutes.toString());

  const handleApply = () => {
    onChange({
      startAt,
      endAt,
      remainingBudgetMinutes: parseInt(budget, 10) || 0,
    });
  };

  const totalMin = Math.max(0, parseHHmm(endAt) - parseHHmm(startAt));

  return (
    <Card className="mb-4 bg-slate-50 border-slate-200">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3">오늘의 시간 예산</h3>
        
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <Label className="text-xs">시작 시각</Label>
            <Input 
              type="time" 
              value={startAt} 
              onChange={e => setStartAt(e.target.value)} 
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">종료 시각</Label>
            <Input 
              type="time" 
              value={endAt} 
              onChange={e => setEndAt(e.target.value)} 
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">작업 가능 시간 (분)</Label>
            <Input 
              type="number" 
              min="0"
              value={budget} 
              onChange={e => setBudget(e.target.value)} 
              className="h-8 text-sm"
              placeholder="예: 240"
            />
            <p className="text-[10px] text-muted-foreground mt-0.5">고정 일정 제외 순수 시간</p>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="text-muted-foreground">
            전체 범위: <span className="font-medium text-foreground">{formatDuration(totalMin)}</span>
          </div>
          <Button size="sm" onClick={handleApply}>적용</Button>
        </div>
      </CardContent>
    </Card>
  );
}
