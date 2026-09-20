"use client"

import React from 'react';
import { ScheduleBlock, FixedSchedule } from '@/domain/types';
import { parseHHmm } from '@/domain/time-calc';
import { Card, CardContent } from './ui/card';

interface TimelineProps {
  planStartAt: string;
  planEndAt: string;
  blocks: ScheduleBlock[];
  fixedSchedules: FixedSchedule[];
  getTaskTitle: (taskId: string) => string;
}

export function Timeline({ planStartAt, planEndAt, blocks, fixedSchedules, getTaskTitle }: TimelineProps) {
  const startMin = parseHHmm(planStartAt);
  const endMin = parseHHmm(planEndAt);
  const totalMinutes = endMin - startMin;

  if (totalMinutes <= 0) return null;

  // Combine and sort all items for the timeline
  const items = [
    ...blocks.map(b => ({
      type: 'task' as const,
      id: b.taskId,
      title: getTaskTitle(b.taskId) + (b.appliedScope ? ` (${b.appliedScope})` : ''),
      startAt: b.startAt,
      endAt: b.endAt,
      startMin: parseHHmm(b.startAt),
      endMin: parseHHmm(b.endAt),
    })),
    ...fixedSchedules.map(f => ({
      type: 'fixed' as const,
      id: f.id,
      title: `[고정] ${f.title}`,
      startAt: f.startAt,
      endAt: f.endAt,
      startMin: parseHHmm(f.startAt),
      endMin: parseHHmm(f.endAt),
    }))
  ].filter(item => item.startMin >= startMin && item.endMin <= endMin)
   .sort((a, b) => a.startMin - b.startMin);

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-4 text-lg">실행 시간표</h3>
        
        <div className="relative pl-12 border-l-2 border-muted space-y-6">
          {/* Start marker */}
          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-muted-foreground" />
          <div className="absolute -left-[4.5rem] top-[-4px] text-xs font-medium text-muted-foreground w-16 text-right">
            {planStartAt}
          </div>

          {items.map((item, idx) => {
            const isFixed = item.type === 'fixed';
            return (
              <div key={`${item.id}-${idx}`} className="relative">
                <div className={`absolute -left-[3.1rem] top-2 w-3 h-3 rounded-full border-2 border-background ${isFixed ? 'bg-orange-500' : 'bg-primary'}`} />
                <div className="absolute -left-[7.5rem] top-1.5 text-xs font-medium w-16 text-right">
                  {item.startAt}
                </div>
                
                <div className={`p-3 rounded-md border ${isFixed ? 'bg-orange-50/50 border-orange-200 text-orange-800' : 'bg-primary/5 border-primary/20'}`}>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs opacity-70 mt-1">{item.endMin - item.startMin}분 ({item.startAt} ~ {item.endAt})</p>
                </div>
              </div>
            );
          })}

          {/* End marker */}
          <div className="relative pt-2">
             <div className="absolute -left-[3.1rem] bottom-0 w-3 h-3 rounded-full bg-muted-foreground border-2 border-background" />
             <div className="absolute -left-[7.5rem] bottom-[-2px] text-xs font-medium text-muted-foreground w-16 text-right">
               {planEndAt}
             </div>
             <div className="p-2 text-sm text-muted-foreground">계획 종료</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
