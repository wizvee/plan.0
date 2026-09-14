"use client";

import { useRouter } from "next/navigation";
import { Calendar, Check, LayoutGrid } from "lucide-react";

import { IconRail } from "@/components/icon-rail";

interface AppNavRailProps {
  activePage: "calendar" | "para";
  panelOpen: boolean;
  onTogglePanel: () => void;
}

/** 캘린더 화면과 PARA 화면에서 공유하는 아이콘 레일 — Todo List 토글 + 두 화면 사이 이동. */
export function AppNavRail({ activePage, panelOpen, onTogglePanel }: AppNavRailProps) {
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
          onClick: () => router.push("/"),
        },
      ]}
    />
  );
}
