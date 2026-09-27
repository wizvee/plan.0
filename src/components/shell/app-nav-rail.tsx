"use client";

import { usePathname, useRouter } from "next/navigation";
import { Calendar, Check, LayoutGrid } from "lucide-react";

import { IconRail } from "@/components/shell/icon-rail";
import { useShellUI } from "@/components/shell/shell-ui-context";
import { mondayOf, toDateKey } from "@/lib/week";

/** 캘린더 화면과 PARA 화면에서 공유하는 아이콘 레일 — Todo List 토글 + 두 화면 사이 이동. */
export function AppNavRail() {
  const router = useRouter();
  const pathname = usePathname();
  const { inboxOpen: panelOpen, toggleInbox: onTogglePanel } = useShellUI();
  const activePage: "calendar" | "para" = pathname.startsWith("/para") ? "para" : "calendar";

  function handleCalendarNav() {
    const url = `/?week=${toDateKey(mondayOf(new Date()))}`;
    if (pathname === "/") router.replace(url, { scroll: false });
    else router.push(url);
  }

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
          onClick: handleCalendarNav,
        },
      ]}
    />
  );
}
