"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WeekNavProps {
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function WeekNav({ onPrev, onNext, onToday }: WeekNavProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary hover:bg-accent hover:text-primary"
          onClick={onPrev}
          aria-label="이전 주"
        >
          <ChevronLeft className="size-[18px]" strokeWidth={2.4} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary hover:bg-accent hover:text-primary"
          onClick={onNext}
          aria-label="다음 주"
        >
          <ChevronRight className="size-[18px]" strokeWidth={2.4} />
        </Button>
      </div>
      <Button
        variant="ghost"
        className="h-8 px-2 text-[15px] font-medium text-primary hover:bg-accent hover:text-primary"
        onClick={onToday}
      >
        이번 주
      </Button>
    </div>
  );
}
