"use client";

import { useRouter } from "next/navigation";
import { Calendar, Check, LayoutGrid } from "lucide-react";

import { IconRail } from "@/components/icon-rail";

interface AppNavRailProps {
  activePage: "calendar" | "para";
  panelOpen: boolean;
  onTogglePanel: () => void;
  /** 캘린더 화면에서만 넘겨준다 — 이미 캘린더 화면(월별 뷰 포함)에 있을 때 눌러도 바로 이번 주
   * 주별 뷰로 전환할 수 있게 함. 없으면 기본값대로 "/"로 이동. */
  onCalendarClick?: () => void;
}

/** 캘린더 화면과 PARA 화면에서 공유하는 아이콘 레일 — Todo List 토글 + 두 화면 사이 이동. */
export function AppNavRail({ activePage, panelOpen, onTogglePanel, onCalendarClick }: AppNavRailProps) {
  const router = useRouter();

  return (
    <IconRail
      items={[
        {
          icon: Check,
          label: "Todo List",
          active: panelOpen,
          onClick: onTogglePanel,
        },
        {
          icon: LayoutGrid,
          label: "PARA",
          active: activePage === "para",
          onClick: () => router.push("/para"),
        },
        {
          icon: Calendar,
          label: "캘린더",
          active: activePage === "calendar",
          onClick: () => (onCalendarClick ? onCalendarClick() : router.push("/")),
        },
      ]}
    />
  );
}
