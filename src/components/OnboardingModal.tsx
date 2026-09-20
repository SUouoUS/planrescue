"use client"

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DayInput } from '@/domain/types';

interface OnboardingModalProps {
  onComplete: () => void;
  dayInput: DayInput | null;
  onUpdateDayInput: (updates: Partial<DayInput>) => void;
  onAddFirstTask: (title: string, mins: number) => void;
}

export function OnboardingModal({ onComplete, dayInput, onUpdateDayInput, onAddFirstTask }: OnboardingModalProps) {
  const [step, setStep] = useState(1);

  // Step 2 state
  const [startAt, setStartAt] = useState(dayInput?.startAt || '09:00');
  const [endAt, setEndAt] = useState(dayInput?.endAt || '18:00');
  const [budget, setBudget] = useState(dayInput?.remainingBudgetMinutes?.toString() || '480');

  // Step 3 state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskMins, setTaskMins] = useState('');

  // Sync dayInput when it loads if we are still on step 1/2
  useEffect(() => {
    if (dayInput) {
      setStartAt(dayInput.startAt);
      setEndAt(dayInput.endAt);
      setBudget(dayInput.remainingBudgetMinutes.toString());
    }
  }, [dayInput]);

  const handleStep1Next = () => {
    setStep(2);
  };

  const handleStep2Next = () => {
    const b = parseInt(budget, 10) || 0;
    onUpdateDayInput({
      startAt,
      endAt,
      remainingBudgetMinutes: b
    });
    setStep(3);
  };

  const handleStep3Finish = () => {
    if (taskTitle.trim() && taskMins) {
      const mins = parseInt(taskMins, 10) || 60;
      onAddFirstTask(taskTitle, mins);
    }
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-lg p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
        
        {step === 1 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-bold text-foreground">계획이 틀어졌을 때, 오늘을 다시 정리해요</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed">
              모든 일을 억지로 넣지 않고, 남은 시간 안에서 할 일을 그대로 할지, 범위를 줄일지, 미룰지 정리해 드려요.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <Button onClick={handleStep1Next} className="h-11 text-base">시작하기</Button>
              <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">나중에 볼게요</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">오늘 언제까지 할 수 있나요?</h2>
              <p className="text-[14px] text-muted-foreground mt-2">
                시작 시각과 종료 시각, 실제로 집중할 수 있는 시간을 알려주세요.
              </p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">시작 시각</Label>
                  <Input type="time" value={startAt} onChange={e => setStartAt(e.target.value)} className="h-11 tabular-nums" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">종료 시각</Label>
                  <Input type="time" value={endAt} onChange={e => setEndAt(e.target.value)} className="h-11 tabular-nums" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">실제 작업 가능 시간 (분)</Label>
                <Input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="예: 240" className="h-11 tabular-nums" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                * 수업이나 약속 같은 고정 일정은 나중에 메인 화면에서 추가할 수 있어요.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="h-11 px-4">이전</Button>
              <Button onClick={handleStep2Next} className="h-11 flex-1">다음</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">오늘 해야 할 일을 적어볼까요?</h2>
              <p className="text-[14px] text-muted-foreground mt-2">
                제목과 예상 시간만 적어도 시작할 수 있어요.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">할 일 제목</Label>
                <Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="예: 디자인 시안 리뷰" className="h-11" autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">예상 시간 (분)</Label>
                <Input type="number" value={taskMins} onChange={e => setTaskMins(e.target.value)} placeholder="60" className="h-11 tabular-nums" />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                * 마감 기한이나 중요도는 메인 화면에서 필요할 때 추가할 수 있어요.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="h-11 px-4">이전</Button>
              <Button onClick={handleStep3Finish} className="h-11 flex-1" disabled={!taskTitle.trim() || !taskMins}>오늘 계획 시작하기</Button>
            </div>
            <div className="text-center">
              <button onClick={onComplete} className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">건너뛰기</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
