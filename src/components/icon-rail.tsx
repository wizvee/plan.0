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
    <div className="fixed inset-y-0 right-0 z-50 flex w-14 flex-col items-center gap-2 border-l border-border bg-card py-4">
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
