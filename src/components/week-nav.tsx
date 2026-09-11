"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WeekNavProps {
  label: string;
  rangeLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNav({ label, rangeLabel, onPrev, onNext, onToday }: WeekNavProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-7" onClick={onPrev} aria-label="이전 주">
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-14 text-center text-base font-medium">{label}</span>
        <Button variant="ghost" size="icon" className="size-7" onClick={onNext} aria-label="다음 주">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <span className="text-sm text-muted-foreground">{rangeLabel}</span>
      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onToday}>
        이번 주
      </Button>
    </div>
  );
}
