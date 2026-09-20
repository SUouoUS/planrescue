"use client"

import React from 'react';
import { PlanResult } from '@/domain/types';
import { Card, CardContent } from './ui/card';
import { formatDuration } from '@/domain/time-calc';
import { Badge } from './ui/badge';

interface PlanResultPanelProps {
  result: PlanResult | null;
}

export function PlanResultPanel({ result }: PlanResultPanelProps) {
  if (!result) return null;

  return (
    <Card className="mb-4 bg-primary/5 border-primary/20">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg text-primary">복구된 계획 요약</h3>
          {result.isPreview && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              미리보기 (저장 안 됨)
            </Badge>
          )}
        </div>

        {result.warnings.length > 0 && (
          <div className="mb-4 space-y-2">
            {result.warnings.map((w, idx) => (
              <div key={idx} className="p-2 text-sm bg-red-50 border border-red-200 text-red-800 rounded flex gap-2">
                <span className="font-bold">!</span>
                {w.message}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-background border rounded p-2">
            <p className="text-xs text-muted-foreground">빈 시간 합</p>
            <p className="font-semibold">{formatDuration(result.stats.totalFreeMinutes)}</p>
          </div>
          <div className="bg-background border rounded p-2">
            <p className="text-xs text-muted-foreground">작업 예산</p>
            <p className="font-semibold">{formatDuration(result.stats.budgetMinutes)}</p>
          </div>
          <div className="bg-background border rounded p-2 border-primary/30">
            <p className="text-xs text-muted-foreground">총 배정 시간</p>
            <p className="font-semibold text-primary">{formatDuration(result.stats.allocatedMinutes)}</p>
          </div>
          <div className="bg-background border rounded p-2">
            <p className="text-xs text-muted-foreground">남은 여유 시간</p>
            <p className="font-semibold text-green-600">{formatDuration(result.stats.slackMinutes)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
