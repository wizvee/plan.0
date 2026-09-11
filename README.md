# 주간 Todo Planner

개인용 주간 할 일 관리 웹앱. 기획 배경과 전체 설계는 [PLANNING.md](./PLANNING.md) 참고.

## 현재 구현 상태

- Todo List(전역 보관함) + Mon~Sun 8칸 보드
- 할 일 추가 / 수정(클릭) / 삭제 / 완료 체크
- 드래그 앤 드롭으로 요일 간 이동 및 순서 변경 ([`@dnd-kit`](https://dndkit.com/))
- 주차 이동 (`< 37주 >` 형태 네비게이션, "이번 주" 바로가기)
- UI: [shadcn/ui](https://ui.shadcn.com/) + Tailwind CSS

**저장 방식**: 현재는 브라우저 `localStorage`에만 저장됩니다 (기기 간 동기화 아직 미구현).
기획서의 최종 목표는 Supabase 연동을 통한 다중 기기 동기화이며, 다음 단계에서 진행합니다.

## 시작하기

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인.

## 스택

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · dnd-kit · date-fns
