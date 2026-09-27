"use client";

import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface IconRailItem {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
}

interface IconRailProps {
  items: IconRailItem[];
}

/** 모바일 전용 하단 탭바. 데스크톱 내비게이션은 AppSidebar가 맡는다. */
export function IconRail({ items }: IconRailProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-stretch border-t border-border bg-card sm:hidden">
      {items.map(({ icon: Icon, label, active, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className="flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground"
        >
          <span
            className={cn(
              "flex h-[26px] w-[34px] items-center justify-center rounded-md transition-colors",
              active && "bg-accent"
            )}
          >
            <Icon className={cn("size-[18px]", active && "text-accent-foreground")} />
          </span>
          <span className={cn("text-[10.5px]", active ? "font-bold text-foreground" : "font-medium")}>{label}</span>
        </button>
      ))}
    </div>
  );
}
