"use client"

import React, { useState } from 'react';
import { Task, TaskDecision, UserOverride } from '@/domain/types';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
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

export function TaskCard({ task, decision, userOverride, isMustToday, onOverrideChange, onEdit, onComplete }: TaskCardProps) {
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);

  const getActionColor = (action: string | null | undefined) => {
    switch (action) {
      case 'KEEP': return 'bg-green-100 text-green-800 border-green-200';
      case 'REDUCE': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'POSTPONE': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DROP': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getActionLabel = (action: string | null | undefined) => {
    switch (action) {
      case 'KEEP': return '그대로 (KEEP)';
      case 'REDUCE': return '범위 축소 (REDUCE)';
      case 'POSTPONE': return '미루기 (POSTPONE)';
      case 'DROP': return '오늘 제외 (DROP)';
      default: return '대기';
    }
  };

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
    } catch (e) {
      alert('네트워크 오류가 발생했습니다.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <Card className="mb-3 overflow-hidden">
      <div className={`h-1.5 w-full ${getActionColor(decision?.action).split(' ')[0]}`} />
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{task.title}</h4>
              {isMustToday && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">오늘 필수</Badge>}
              {task.blocked && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800 border-yellow-200">외부 대기</Badge>}
            </div>
            <div className="text-xs text-muted-foreground flex gap-3">
              <span>예상: {task.estimatedMinutes ? formatDuration(task.estimatedMinutes) : '미정'}</span>
              {task.deadline && <span>마감: {new Date(task.deadline).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 text-xs px-2">수정</Button>
            <Button variant="outline" size="sm" onClick={onComplete} className="h-7 text-xs px-2 border-green-200 text-green-700 hover:bg-green-50">완료</Button>
          </div>
        </div>

        {decision && (
          <div className="mt-3 p-3 bg-muted/50 rounded-md text-sm border">
            <div className="flex items-center gap-2 font-medium mb-1">
              <span className={`px-2 py-0.5 rounded text-xs border ${getActionColor(decision.action)}`}>
                {getActionLabel(decision.action)}
              </span>
              <span className="text-muted-foreground text-xs">{decision.reasonText}</span>
            </div>
            
            {decision.action === 'REDUCE' && decision.appliedScope && (
              <div className="mt-2 text-xs bg-background p-2 rounded border border-blue-100">
                <span className="font-semibold text-blue-700">최소 범위:</span> {decision.appliedScope}
                <div className="mt-1 opacity-70">
                  시간 단축: {formatDuration(task.estimatedMinutes!)} → {formatDuration(decision.appliedMinutes!)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-medium text-muted-foreground">강제 지정:</span>
          <select 
            className="text-xs border rounded p-1"
            value={userOverride}
            onChange={e => onOverrideChange(e.target.value as UserOverride)}
          >
            <option value="AUTO">자동 (AUTO)</option>
            <option value="KEEP">그대로 (KEEP)</option>
            <option value="REDUCE">범위 축소 (REDUCE)</option>
            <option value="POSTPONE">미루기 (POSTPONE)</option>
            <option value="DROP">오늘 제외 (DROP)</option>
          </select>
          
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-7 text-xs ml-auto"
            onClick={handleAiSuggest}
            disabled={loadingAi}
          >
            {loadingAi ? '생성 중...' : '✨ 최소 범위 제안받기'}
          </Button>
        </div>

        {aiSuggestion && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md text-sm">
            {aiSuggestion.needsClarification ? (
              <div>
                <p className="font-medium text-blue-800">정보가 부족합니다.</p>
                <p className="text-blue-700 text-xs mt-1">{aiSuggestion.question}</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-blue-800">AI 제안 최소 범위</p>
                <p className="text-xs mt-1 text-blue-900">{aiSuggestion.suggestedScope}</p>
                <p className="text-[10px] mt-1 text-blue-700">이유: {aiSuggestion.rationale}</p>
                <p className="text-[10px] text-blue-700">완료 기준: {aiSuggestion.doneCriteria}</p>
                <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs border-blue-200">
                  이 제안 채택하기 (작업 수정으로 이동)
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
