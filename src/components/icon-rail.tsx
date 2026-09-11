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

export function IconRail({ items }: IconRailProps) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-50 flex h-14 items-center justify-center gap-8 border-t border-border bg-card sm:left-auto sm:top-0 sm:h-auto sm:w-14 sm:flex-col sm:justify-start sm:gap-2 sm:border-t-0 sm:border-l sm:py-4">
      {items.map(({ icon: Icon, label, active, onClick }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={active}
          className={cn(
            "flex size-10 items-center justify-center rounded-full transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-primary"
          )}
        >
          <Icon className="size-5" />
        </button>
      ))}
    </div>
  );
}
