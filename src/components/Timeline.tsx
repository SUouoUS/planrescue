"use client"

import React from 'react';
import { ScheduleBlock, FixedSchedule } from '@/domain/types';
import { parseHHmm, formatHHmm, formatDuration } from '@/domain/time-calc';

interface TimelineProps {
  planStartAt: string;
  planEndAt: string;
  blocks: ScheduleBlock[];
  fixedSchedules: FixedSchedule[];
  getTaskTitle: (taskId: string) => string;
}

interface TimelineItem {
  type: 'task' | 'fixed' | 'gap';
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  startMin: number;
  endMin: number;
  scope?: string | null;
}

export function Timeline({ planStartAt, planEndAt, blocks, fixedSchedules, getTaskTitle }: TimelineProps) {
  const startMin = parseHHmm(planStartAt);
  const endMin = parseHHmm(planEndAt);
  const totalMinutes = endMin - startMin;

  if (totalMinutes <= 0) return null;

  // Build all items
  const scheduled: TimelineItem[] = [
    ...blocks.map(b => ({
      type: 'task' as const,
      id: b.taskId,
      title: getTaskTitle(b.taskId),
      startAt: b.startAt,
      endAt: b.endAt,
      startMin: parseHHmm(b.startAt),
      endMin: parseHHmm(b.endAt),
      scope: b.appliedScope,
    })),
    ...fixedSchedules.map(f => ({
      type: 'fixed' as const,
      id: f.id,
      title: f.title,
      startAt: f.startAt,
      endAt: f.endAt,
      startMin: parseHHmm(f.startAt),
      endMin: parseHHmm(f.endAt),
      scope: null,
    })),
  ]
    .filter(item => item.startMin >= startMin && item.endMin <= endMin)
    .sort((a, b) => a.startMin - b.startMin);

  // Insert gaps
  const withGaps: TimelineItem[] = [];
  let cursor = startMin;

  for (const item of scheduled) {
    if (item.startMin > cursor) {
      withGaps.push({
        type: 'gap',
        id: `gap-${cursor}`,
        title: '',
        startAt: formatHHmm(cursor),
        endAt: formatHHmm(item.startMin),
        startMin: cursor,
        endMin: item.startMin,
      });
    }
    withGaps.push(item);
    cursor = Math.max(cursor, item.endMin);
  }

  if (cursor < endMin) {
    withGaps.push({
      type: 'gap',
      id: `gap-${cursor}`,
      title: '',
      startAt: formatHHmm(cursor),
      endAt: formatHHmm(endMin),
      startMin: cursor,
      endMin: endMin,
    });
  }

  // Calculate summary
  const totalTaskMin = blocks.reduce((s, b) => s + (parseHHmm(b.endAt) - parseHHmm(b.startAt)), 0);
  const totalFixedMin = fixedSchedules
    .filter(f => parseHHmm(f.startAt) >= startMin && parseHHmm(f.endAt) <= endMin)
    .reduce((s, f) => s + (parseHHmm(f.endAt) - parseHHmm(f.startAt)), 0);
  const freeMin = Math.max(0, totalMinutes - totalTaskMin - totalFixedMin);

  return (
    <div>
      {/* Summary */}
      {blocks.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>배정 <span className="font-medium text-foreground tabular-nums">{formatDuration(totalTaskMin)}</span></span>
          {totalFixedMin > 0 && (
            <span>고정 <span className="font-medium text-foreground tabular-nums">{formatDuration(totalFixedMin)}</span></span>
          )}
          <span>여유 <span className="font-medium text-foreground tabular-nums">{formatDuration(freeMin)}</span></span>
        </div>
      )}

      {/* Timeline items */}
      <div className="space-y-0">
        {withGaps.map((item) => {
          const duration = item.endMin - item.startMin;

          if (item.type === 'gap') {
            return (
              <div key={item.id} className="flex items-stretch">
                <div className="w-[52px] flex-shrink-0 text-right pr-3 py-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{item.startAt}</span>
                </div>
                <div className="flex-1 border-l-2 border-dashed border-border pl-3 py-2 min-h-[28px]">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(duration)}</span>
                </div>
              </div>
            );
          }

          if (item.type === 'fixed') {
            return (
              <div key={item.id} className="flex items-stretch">
                <div className="w-[52px] flex-shrink-0 text-right pr-3 py-2">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{item.startAt}</span>
                </div>
                <div className="flex-1 border-l-2 border-muted-foreground/30 pl-3 py-2">
                  <div className="px-3 py-2 rounded-md bg-secondary">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground px-1 py-0.5 rounded bg-background">고정</span>
                      <span className="text-sm">{item.title}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                      {item.startAt}–{item.endAt} · {formatDuration(duration)}
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Task item
          return (
            <div key={`${item.id}-${item.startMin}`} className="flex items-stretch">
              <div className="w-[52px] flex-shrink-0 text-right pr-3 py-2">
                <span className="text-[11px] text-muted-foreground tabular-nums">{item.startAt}</span>
              </div>
              <div className="flex-1 border-l-2 border-primary/40 pl-3 py-2">
                <div className="px-3 py-2 rounded-md bg-card border border-border">
                  <p className="text-sm font-medium leading-snug">{item.title}</p>
                  {item.scope && (
                    <p className="text-xs text-muted-foreground mt-0.5">범위: {item.scope}</p>
                  )}
                  <div className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                    {item.startAt}–{item.endAt} · {formatDuration(duration)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* End marker */}
        <div className="flex items-stretch">
          <div className="w-[52px] flex-shrink-0 text-right pr-3 py-1">
            <span className="text-[11px] text-muted-foreground tabular-nums">{planEndAt}</span>
          </div>
          <div className="flex-1 border-l-2 border-border pl-3 py-1">
            <span className="text-xs text-muted-foreground">종료</span>
          </div>
        </div>
      </div>
    </div>
  );
}
