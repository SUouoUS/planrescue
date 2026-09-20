# PlanRescue MVP 구현 계획

## 1. 핵심 사용자 흐름
1. **일정 초기 설정**: 앱 실행 시 현재 날짜 표시. 고정 일정(예: 식사, 미팅)과 오늘 작업 가능한 총 시간(예산)을 입력.
2. **할 일 목록 등록/관리**: 예상 소요시간, 중요도, 마감 기한, 타인에게 미치는 영향, 외부 대기 여부 등을 입력하여 할 일을 등록.
3. **계획 복구 실행 ('오늘 계획 복구하기')**: 
   - 현재 시간을 기준으로 남은 작업 가능 시간 내에 할 일들을 배치.
   - 배치 우선순위(중요도, 마감, 타인 영향) 및 필수/제외 여부에 따라 각 업무를 `KEEP`(유지), `REDUCE`(축소), `POSTPONE`(연기), `DROP`(제외) 중 하나로 판단.
   - AI 제안(Gemini) 또는 수동으로 축소된 범위(REDUCE)를 적용할 수 있음.
4. **결과 확인 및 조정**: 
   - 계산된 타임라인(시간표) 확인.
   - 판단 결과가 마음에 들지 않으면, 수동으로 판단 상태 변경(예: 강제 KEEP, 수동 REDUCE) 후 다시 계획 적용(재계산).
5. **실행 및 상태 업데이트**: 
   - 완료한 업무는 체크하여 상태 업데이트.
   - 시간이 흐른 후, '지금부터 다시 복구'를 통해 남은 시간과 일정을 재조정.

## 2. MVP 기능
- [x] 도메인 로직 (엔진, 시간 계산, 우선순위 계산): 순수 함수로 구현.
- [x] 로컬 스토리지 (IndexedDB) 및 백업/복원 기능.
- [x] AI 제안 API (Next.js Route Handler + @google/genai SDK 연동).
- [ ] UI 컴포넌트 구현:
  - 할 일 등록 폼 (TaskForm)
  - 할 일 카드 (TaskCard) - 상태 변경, AI 제안 호출 등
  - 고정 일정 설정 및 가용 시간 설정 패널 (DaySettingsPanel)
  - 복구된 타임라인 시간표 (Timeline)
- [ ] 전체 페이지 (app/page.tsx) 통합 및 상태 관리.
- [ ] Playwright E2E 테스트 및 Vitest 단위 테스트 보완.

## 3. 화면 구조
- **상단**: 앱 타이틀, 현재 날짜 표시. 가용 시간 / 배정된 시간 / 남은 여유 시간 요약 바.
- **좌측/메인**: 할 일 등록 폼 및 현재 할 일 목록 (카드 형태).
- **우측/하단(모바일)**: '오늘 계획 복구하기' 버튼, 계산된 복구 타임라인, 미뤄지거나 제외된 작업 목록 영역.

## 4. 데이터 구조
- **Task**: 할 일 정보 (`id`, `title`, `estimatedMinutes`, `deadline`, `importance`, `blocked`, `reduction` 등)
- **DayInput**: 하루의 환경 정보 (`date`, `startAt`, `endAt`, `remainingBudgetMinutes`, 고정 일정 목록 등)
- **PlanResult**: 엔진이 계산한 복구 결과 (`action`, `reasonCode`, `scheduledStart`, `scheduledEnd` 등)

## 5. 기술 구조와 구현 순서
1. **package.json 점검**: `test`, `typecheck` 등 필수 스크립트 추가.
2. **도메인 로직 보완 및 테스트**: 기존에 작성된 `engine.ts`, `priority.ts` 등의 테스트를 통과하는지 확인하고 부족한 부분(예: 수동 판단 무시 버그 등) 수정.
3. **UI/UX 조립**: 
   - `DaySettingsPanel`, `TaskForm`, `TaskCard` 등 개별 컴포넌트에 디자인 시스템(TailwindCSS) 적용.
   - 메인 `page.tsx`에 상태(State)를 연결하여 '등록 -> 복구 -> 적용' 플로우 완성.
4. **AI 연동 확인**: `api/ai/suggest` 라우트 핸들러 검증.
5. **E2E 테스트 및 배포 준비**: `npm run build`, `npm run test`가 정상 작동하는지 확인.
