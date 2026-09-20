"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function HelpPage() {
  const router = useRouter();

  const handleResetOnboarding = () => {
    localStorage.removeItem('planrescue_onboarded');
    router.push('/');
  };

  return (
    <div className="max-w-[700px] mx-auto px-4 py-8 md:py-12 min-h-screen">
      <div className="mb-10 text-center">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">PlanRescue 사용법</h1>
        <p className="text-sm md:text-base text-muted-foreground">계획이 틀어진 날, 다시 시작하는 방법</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">기본 사용법 (3단계)</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h3 className="font-semibold text-foreground">오늘 가능한 시간 정하기</h3>
                <p className="text-sm text-muted-foreground mt-1">오늘 집중할 수 있는 실제 시간을 설정하세요. 점심시간이나 고정된 회의는 고정 일정으로 뺄 수 있습니다.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h3 className="font-semibold text-foreground">오늘 할 일 추가하기</h3>
                <p className="text-sm text-muted-foreground mt-1">해야 할 일과 예상 시간을 입력하세요. 세부 설정에서 마감일이나 필수 여부를 정할 수 있습니다.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h3 className="font-semibold text-foreground">계획 복구하기</h3>
                <p className="text-sm text-muted-foreground mt-1">'오늘 계획 복구하기'를 누르면, 남은 시간에 맞춰 오늘 꼭 해야 할 일과 미뤄도 될 일을 정리해 드립니다.</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">주요 용어 설명</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-keep)]"></span>
                그대로 하기 (KEEP)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">원래 계획대로 오늘 문제없이 진행할 수 있는 업무입니다.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-reduce)]"></span>
                범위 축소 (REDUCE)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">시간이 부족하여 오늘 반드시 해야 할 일을 최소 성공 목표까지만 줄여서 진행합니다.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-postpone)]"></span>
                미루기 (POSTPONE)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">오늘 일정에서 빼고 나중에 다시 정리해도 되는 업무입니다.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-[var(--status-drop)]"></span>
                오늘 제외 (DROP)
              </h3>
              <p className="text-sm text-muted-foreground mt-1">오늘은 하지 않기로 결정된 업무입니다. 원래 업무 자체가 삭제되지는 않습니다.</p>
            </div>
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-border"></span>
                외부 답변 대기
              </h3>
              <p className="text-sm text-muted-foreground mt-1">다른 사람의 답변이나 자료가 필요해 지금은 진행하기 어려운 일입니다. 시간이 부족할 때 우선적으로 미뤄집니다.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 pb-2 border-b border-border">자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-4">
            <details className="group border border-border rounded-lg bg-card">
              <summary className="p-4 font-medium cursor-pointer list-none flex justify-between items-center">
                예상 시간을 모르겠어요.
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-muted-foreground border-t border-border mt-1">
                처음에는 30분이나 60분 등 어림잡아 입력해 보세요. 정확하지 않아도 전체적인 계획을 짜는 데 도움이 됩니다.
              </div>
            </details>
            <details className="group border border-border rounded-lg bg-card">
              <summary className="p-4 font-medium cursor-pointer list-none flex justify-between items-center">
                모든 일을 오늘 해야 하나요?
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-muted-foreground border-t border-border mt-1">
                아니요, 꼭 필요한 일만 '오늘 필수'로 지정하세요. 무리하게 모든 일정을 잡기보다 남은 시간에 맞게 조정하는 것이 PlanRescue의 핵심입니다.
              </div>
            </details>
            <details className="group border border-border rounded-lg bg-card">
              <summary className="p-4 font-medium cursor-pointer list-none flex justify-between items-center">
                미룬 업무의 마감은 바뀌나요?
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-muted-foreground border-t border-border mt-1">
                아니요, 원래 마감은 그대로 유지됩니다. 단지 '오늘 일정'에서만 빠지는 것입니다.
              </div>
            </details>
            <details className="group border border-border rounded-lg bg-card">
              <summary className="p-4 font-medium cursor-pointer list-none flex justify-between items-center">
                데이터는 어디에 저장되나요?
                <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 pt-0 text-sm text-muted-foreground border-t border-border mt-1">
                작성하신 모든 정보는 회원가입이나 서버 전송 없이 사용 중인 브라우저(IndexedDB)에만 안전하게 저장됩니다. (단, AI 제안 기능 사용 시 일부 텍스트가 Gemini로 전송됩니다.)
              </div>
            </details>
          </div>
        </section>

        <section className="pt-8 border-t border-border flex justify-center">
          <Button variant="outline" onClick={handleResetOnboarding} className="h-10 px-6">
            처음 사용법 다시 보기
          </Button>
        </section>
      </div>
    </div>
  );
}
