"use client"

import React from 'react';
import { PlanResult } from '@/domain/types';
import { formatDuration } from '@/domain/time-calc';

interface PlanResultPanelProps {
  result: PlanResult | null;
}

export function PlanResultPanel({ result }: PlanResultPanelProps) {
  if (!result) return null;

  return (
    <div className="border border-border bg-card rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-medium">복구 결과 요약</h3>
        {result.isPreview && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            미리보기 (저장 안 됨)
          </span>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div className="mb-3 space-y-1">
          {result.warnings.map((w, idx) => (
            <div key={idx} className="flex gap-1.5 text-xs text-[var(--status-error)]">
              <span className="font-bold flex-shrink-0">!</span>
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">
          총 배정 시간 <span className="font-medium text-foreground tabular-nums">{formatDuration(result.stats.allocatedMinutes)}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          작업 예산 <span className="tabular-nums">{formatDuration(result.stats.budgetMinutes)}</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          남은 여유 <span className="tabular-nums">{formatDuration(result.stats.slackMinutes)}</span>
        </span>
      </div>
    </div>
  );
}
