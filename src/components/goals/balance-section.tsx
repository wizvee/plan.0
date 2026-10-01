"use client";

import { useState } from "react";
import { CaretRight, Moon } from "@/components/icons";

import { InlineText } from "@/components/inline-text";
import { cn } from "@/lib/utils";
import { contextColor } from "@/lib/context-color";
import { balanceDelta, previousMinutesOf, type BalanceRow, type WeekBalance } from "@/lib/balance";
import { DAY_LABELS_KO, DAY_KEYS, type ParaKind } from "@/lib/types";
import { MINUTES_PER_DAY, formatClock, formatDuration } from "@/lib/time";
import { useBalance } from "@/lib/app-data/use-balance";
import { useContainers } from "@/lib/app-data/use-containers";
import { useShellUI } from "@/lib/shell-ui";

/** 차트 높이 · 눈금 간격 (시안 ① — 18시간 = 180px 언저리) */
const CHART_PX = 180;
const TICK_MINUTES = 6 * 60;
/** 펼친 행에서 보여줄 PARA 수 — 나머지는 "외 N개" */
const CONTAINER_LIMIT = 5;
/** 공백 — 색이 아니라 회색 빗금 (시안 ⑥) */
const GAP_FILL = "repeating-linear-gradient(135deg, rgba(0,0,0,0.10) 0 2px, rgba(0,0,0,0.035) 2px 5px)";
const GAP_SWATCH = "repeating-linear-gradient(135deg, rgba(0,0,0,0.22) 0 2px, rgba(0,0,0,0.06) 2px 4px)";

const rowKey = (row: BalanceRow) => row.context?.id ?? "";
const rowColor = (row: BalanceRow) => (row.context ? contextColor(row.context.color) : "var(--ctx-gray)");
const rowName = (row: BalanceRow) => row.context?.name ?? "컨텍스트 없음";

/**
 * 목표 화면의 시간 균형 (BALANCE-PLAN.md 4단계 · 시안 ① ②). 체크한 캘린더 블록을 컨텍스트(영역)별로 모아
 * 요일별 누적 막대 + 영역 목록(누르면 PARA별 · 막대에서 그 영역만 진하게) + 수면 줄로 보여준다.
 * 계산은 `lib/balance.ts` — 여기서는 그리기만.
 */
export function BalanceSection({ weekStart }: { weekStart: string }) {
  const balance = useBalance(weekStart);
  const { containerNameOf } = useContainers();
  const { openContextManager } = useShellUI();
  if (!balance) return null;
  return (
    <BalanceView
      current={balance.current}
      previous={balance.previous}
      nameOfContainer={(kind, id) =>
        containerNameOf({
          projectId: kind === "project" ? id : null,
          areaId: kind === "area" ? id : null,
          resourceId: kind === "resource" ? id : null,
        })
      }
      onOpenContextManager={() => openContextManager()}
    />
  );
}

/** 그리기만 — 데이터는 `BalanceSection`이 훅에서 읽어 넘긴다 */
export function BalanceView({
  current,
  previous,
  nameOfContainer,
  onOpenContextManager,
}: {
  current: WeekBalance;
  previous: WeekBalance;
  nameOfContainer: (kind: ParaKind, id: string) => string | undefined;
  onOpenContextManager: () => void;
}) {
  // 누른 영역 — 막대에서 그 영역만 진하게 + 행 아래 PARA별. 다시 누르면 해제
  const [selected, setSelected] = useState<string | null>(null);
  const fullWeek = current.rangeMinutes === 7 * MINUTES_PER_DAY;

  return (
    <section aria-labelledby="balance-title" className="mt-3 flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="balance-title" className="text-[20px] font-bold tracking-[-0.3px]">
          시간 균형
        </h2>
        <span className="text-[12.5px] text-muted-foreground">
          체크한 캘린더 블록만 · 겹친 시간은 한 번만 · {fullWeek ? "7일 전체" : `지금(${nowLabel(current)})까지`}
        </span>
      </div>

      {current.rangeMinutes === 0 ? (
        <p className="rounded-xl bg-secondary px-4 py-3.5 text-[13px] text-muted-foreground">
          아직 오지 않은 주예요 — 이 주가 시작되면 체크한 블록부터 여기에 쌓여요.
        </p>
      ) : (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[500px_minmax(0,1fr)]">
          <ChartCard current={current} previous={previous} selected={selected} fullWeek={fullWeek} />
          <div className="flex flex-col gap-3">
            <RowList
              current={current}
              previous={previous}
              selected={selected}
              onSelect={setSelected}
              nameOfContainer={nameOfContainer}
            />
            <SleepLine current={current} onOpenContextManager={onOpenContextManager} />
          </div>
        </div>
      )}
    </section>
  );
}

/** "목 오후 9시" — 센 범위의 끝(지금) */
function nowLabel(balance: WeekBalance): string {
  const day = Math.min(Math.floor(balance.rangeMinutes / MINUTES_PER_DAY), 6);
  return `${DAY_LABELS_KO[DAY_KEYS[day]]} ${formatClock(balance.rangeMinutes - day * MINUTES_PER_DAY)}`;
}

/**
 * 지난주 대비 공백 — 비교할 수 없으면 null. 지난주에 기록이 없거나, 한 주만 수면을 기록했으면(수면을 처음 적기 시작한 주)
 * 깨어 있는 시간의 기준이 달라 공백이 통째로 줄거나 는 것처럼 보이므로 비교하지 않는다.
 */
function gapDeltaOf(current: WeekBalance, previous: WeekBalance): number | null {
  if (previous.recordedMinutes + previous.sleepMinutes === 0) return null;
  if ((previous.sleepMinutes > 0) !== (current.sleepMinutes > 0)) return null;
  return balanceDelta(current.gapMinutes, previous.gapMinutes);
}

function percentOf(minutes: number, total: number): string {
  return total > 0 ? `${Math.round((minutes / total) * 100)}%` : "–";
}

function deltaLabel(delta: number): string {
  if (delta === 0) return "–";
  return `${delta > 0 ? "↑" : "↓"} ${formatDuration(Math.abs(delta))}`;
}

/** 머리 숫자 + 요일별 누적 막대 */
function ChartCard({
  current,
  previous,
  selected,
  fullWeek,
}: {
  current: WeekBalance;
  previous: WeekBalance;
  selected: string | null;
  fullWeek: boolean;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxAwake = Math.max(...current.days.map((d) => d.awakeMinutes), 0);
  // 눈금은 6시간 단위, 최소 18시간 — 하루 깨어 있는 시간이 대개 16~17시간이라 막대 높이가 주마다 크게 출렁이지 않게
  const axisMax = Math.max(3 * TICK_MINUTES, Math.ceil(maxAwake / TICK_MINUTES) * TICK_MINUTES);
  const ticks = Array.from({ length: axisMax / TICK_MINUTES + 1 }, (_, i) => i * TICK_MINUTES);
  const px = (minutes: number) => (minutes / axisMax) * CHART_PX;

  const gapDelta = gapDeltaOf(current, previous);
  const since = fullWeek ? "지난주보다" : "지난주 이맘때보다";

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border px-4 pb-4 pt-[18px] sm:px-5">
      <div className="flex flex-col gap-[3px]">
        <span className="text-[12.5px] text-muted-foreground">깨어 있는 {formatDuration(current.awakeMinutes)} 중</span>
        <span className="text-[24px] font-bold tracking-[-0.5px] sm:text-[26px]">
          {formatDuration(current.recordedMinutes)} 기록{" "}
          <span className="text-[14px] font-semibold text-muted-foreground sm:text-[15px]">
            {percentOf(current.recordedMinutes, current.awakeMinutes)}
          </span>
        </span>
        {gapDelta !== null ? (
          <span className="text-[12.5px] text-muted-foreground">
            {gapDelta === 0
              ? `${since} 공백이 비슷해요`
              : `${since} 공백 ${formatDuration(Math.abs(gapDelta))} ${gapDelta < 0 ? "줄었어요" : "늘었어요"}`}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2.5">
        <div className="relative flex-1" style={{ height: CHART_PX }}>
          {ticks.map((t) => (
            <div
              key={t}
              aria-hidden="true"
              className={cn("absolute inset-x-0 border-t", t === 0 ? "border-black/[0.14]" : "border-dashed border-black/10")}
              style={{ bottom: px(t) }}
            />
          ))}
          <div className="absolute inset-0 grid grid-cols-7 items-end">
            {current.days.map((day, i) => {
              const segments = [
                ...current.rows.map((row) => ({
                  key: rowKey(row),
                  minutes: day.byContext[rowKey(row)] ?? 0,
                  background: rowColor(row),
                })),
                { key: "gap", minutes: day.gapMinutes, background: GAP_FILL },
              ].filter((s) => s.minutes > 0);
              const label = `${DAY_LABELS_KO[DAY_KEYS[i]]}요일 깨어 있는 ${formatDuration(day.awakeMinutes)} 중 기록 ${formatDuration(
                day.awakeMinutes - day.gapMinutes
              )}`;
              return (
                <div key={day.date} className="relative flex h-full items-end justify-center">
                  {day.state === "future" ? (
                    <div className="h-0.5 w-6 rounded-full bg-black/[0.08] sm:w-[30px]" aria-hidden="true" />
                  ) : (
                    <button
                      type="button"
                      aria-label={label}
                      onMouseEnter={() => setHovered(i)}
                      onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
                      onFocus={() => setHovered(i)}
                      onBlur={() => setHovered((h) => (h === i ? null : h))}
                      onClick={() => setHovered((h) => (h === i ? null : i))}
                      // 누르는 곳은 막대보다 넓게(칸 전체 높이) — 짧은 막대도 잡기 쉽게
                      className="flex h-full w-full items-end justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span
                        // 위 끝만 둥글게(바닥에 붙은 막대), 조각 사이 2px 틈
                        className="flex w-6 flex-col-reverse gap-[2px] overflow-hidden rounded-t-[4px] sm:w-[30px]"
                        aria-hidden="true"
                      >
                        {segments.map((s) => (
                          <span
                            key={s.key}
                            className="block shrink-0 transition-opacity"
                            style={{
                              height: Math.max(px(s.minutes), 2),
                              background: s.background,
                              opacity: selected !== null && s.key !== selected ? 0.28 : 1,
                            }}
                          />
                        ))}
                      </span>
                    </button>
                  )}
                  {hovered === i ? <DayTooltip balance={current} dayIndex={i} /> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="relative w-10 shrink-0 text-[10.5px] text-muted-foreground sm:w-11 sm:text-[11px]" style={{ height: CHART_PX }}>
          {ticks.map((t) => (
            <span key={t} className="absolute left-0 translate-y-1/2 tabular-nums" style={{ bottom: px(t) }}>
              {t === 0 ? "0" : `${t / 60}시간`}
            </span>
          ))}
        </div>
      </div>
      <div className="-mt-2 flex gap-2.5">
        <div className="grid flex-1 grid-cols-7 text-center text-[12px] text-muted-foreground">
          {current.days.map((day, i) => (
            <span
              key={day.date}
              className={cn(day.state === "today" && "font-bold text-today", day.state === "future" && "text-muted-foreground/50")}
            >
              {DAY_LABELS_KO[DAY_KEYS[i]]}
            </span>
          ))}
        </div>
        <div className="w-10 shrink-0 sm:w-11" />
      </div>
    </div>
  );
}

/** 요일 막대 위에 뜨는 그날 내역 — 0분인 영역은 뺀다 */
function DayTooltip({ balance, dayIndex }: { balance: WeekBalance; dayIndex: number }) {
  const day = balance.days[dayIndex];
  const lines = balance.rows
    .map((row) => ({ row, minutes: day.byContext[rowKey(row)] ?? 0 }))
    .filter((l) => l.minutes > 0);
  // 가장자리 막대는 카드 밖으로 안 나가게 안쪽으로 붙인다
  const align = dayIndex <= 1 ? "left-0" : dayIndex >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute bottom-[calc(100%+6px)] z-20 w-[200px] rounded-[10px] border border-black/10 bg-popover/95 p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.16),0_2px_6px_rgba(0,0,0,0.06)] backdrop-blur",
        align
      )}
    >
      <p className="mb-1.5 whitespace-nowrap text-[12px] font-bold">
        {DAY_LABELS_KO[DAY_KEYS[dayIndex]]} · 깨어 있는 {formatDuration(day.awakeMinutes)}
      </p>
      <div className="flex flex-col gap-1 text-[12px]">
        {lines.map(({ row, minutes }) => (
          <span key={rowKey(row)} className="flex items-center gap-1.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: rowColor(row) }} />
            <span className="min-w-0 flex-1 truncate">{rowName(row)}</span>
            <span className="tabular-nums text-muted-foreground">{formatDuration(minutes)}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="size-2 shrink-0 rounded-[2px]" style={{ background: GAP_SWATCH }} />
          <span className="flex-1">공백</span>
          <span className="tabular-nums text-muted-foreground">{formatDuration(day.gapMinutes)}</span>
        </span>
        {balance.sleepContext && day.sleepMinutes > 0 ? (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Moon weight="bold" className="size-2.5 shrink-0" style={{ color: contextColor(balance.sleepContext.color) }} />
            <span className="flex-1">수면</span>
            <span className="tabular-nums">{formatDuration(day.sleepMinutes)}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** 영역 목록 — 흰 카드 헤어라인 행. 누르면 PARA별로 펼치고 막대에서 그 영역만 진하게 */
function RowList({
  current,
  previous,
  selected,
  onSelect,
  nameOfContainer,
}: {
  current: WeekBalance;
  previous: WeekBalance;
  selected: string | null;
  onSelect: (key: string | null) => void;
  nameOfContainer: (kind: ParaKind, id: string) => string | undefined;
}) {
  const gapDelta = gapDeltaOf(current, previous) ?? 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {current.rows.map((row, i) => {
        const key = rowKey(row);
        const open = selected === key;
        const delta = balanceDelta(row.minutes, previousMinutesOf(previous, row.context));
        const expandable = row.containers.length > 0;
        const shown = row.containers.slice(0, CONTAINER_LIMIT);
        const rest = row.containers.length - shown.length;
        return (
          <div key={key} className={cn(i > 0 && "border-t border-border")}>
            <button
              type="button"
              onClick={() => onSelect(open ? null : key)}
              aria-expanded={expandable ? open : undefined}
              aria-pressed={expandable ? undefined : open}
              className={cn(
                "flex h-[52px] w-full items-center gap-2.5 px-3.5 text-left sm:h-12 sm:px-4",
                open ? "bg-primary/[0.06]" : "hover:bg-black/[0.03]"
              )}
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: rowColor(row) }} />
              <RowName
                name={rowName(row)}
                note={row.context?.isDefault ? "PARA 없음 포함" : null}
                mobileDetail={`${percentOf(row.minutes, current.awakeMinutes)} · ${deltaLabel(delta)}`}
                bold={open}
              />
              <Figures
                delta={deltaLabel(delta)}
                percent={percentOf(row.minutes, current.awakeMinutes)}
                minutes={row.minutes}
              />
              <CaretRight
                weight="bold"
                className={cn(
                  "size-3 shrink-0 text-muted-foreground/60 transition-transform",
                  open && expandable && "rotate-90 text-muted-foreground",
                  !expandable && "invisible"
                )}
                aria-hidden="true"
              />
            </button>
            {open && expandable ? (
              <div className="bg-primary/[0.03] pb-2 pt-0.5">
                {shown.map((c) => {
                  const name = c.kind && c.id ? nameOfContainer(c.kind, c.id) : undefined;
                  return (
                    <div key={c.id ?? "none"} className="flex h-[30px] items-center gap-2 pl-9 pr-11 text-[13px]">
                      {c.kind ? (
                        <span
                          className="size-[7px] shrink-0 rounded-full"
                          style={{ backgroundColor: rowColor(row) }}
                        />
                      ) : (
                        <span className="size-[7px] shrink-0 rounded-full border border-muted-foreground/60" />
                      )}
                      <span className={cn("min-w-0 flex-1 truncate", !name && "text-muted-foreground")}>
                        {name ? <InlineText text={name} /> : "PARA 없음"}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{formatDuration(c.minutes)}</span>
                    </div>
                  );
                })}
                {rest > 0 ? <p className="pl-9 pt-0.5 text-[12px] text-muted-foreground">외 {rest}개</p> : null}
              </div>
            ) : null}
          </div>
        );
      })}

      <div className="flex h-[52px] items-center gap-2.5 border-t border-border bg-panel px-3.5 sm:h-12 sm:px-4">
        <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: GAP_SWATCH }} />
        <RowName
          name="공백"
          note="기록 없는 깨어 있는 시간"
          mobileDetail={`${percentOf(current.gapMinutes, current.awakeMinutes)} · ${deltaLabel(gapDelta)}`}
        />
        <Figures
          delta={deltaLabel(gapDelta)}
          percent={percentOf(current.gapMinutes, current.awakeMinutes)}
          minutes={current.gapMinutes}
        />
        <span className="w-3 shrink-0" />
      </div>
    </div>
  );
}

/** 이름 + (데스크톱) 회색 설명 / (모바일) 비율 · 대비 줄 */
function RowName({ name, note, mobileDetail, bold }: { name: string; note: string | null; mobileDetail: string; bold?: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className={cn("truncate text-[15px] sm:text-[14.5px]", bold ? "font-bold" : "font-semibold")}>
        {name}
        {note ? <span className="ml-1.5 hidden text-[12px] font-normal text-muted-foreground sm:inline">{note}</span> : null}
      </span>
      <span className="text-[12px] text-muted-foreground sm:hidden">{mobileDetail}</span>
    </span>
  );
}

/** (데스크톱) 대비 · 비율 · 시간 / (모바일) 시간만 */
function Figures({ delta, percent, minutes }: { delta: string; percent: string; minutes: number }) {
  return (
    <>
      <span className="hidden w-[92px] shrink-0 text-right text-[12px] tabular-nums text-muted-foreground sm:block">{delta}</span>
      <span className="hidden w-10 shrink-0 text-right text-[13px] tabular-nums text-muted-foreground sm:block">{percent}</span>
      <span
        className={cn(
          "shrink-0 text-right text-[15px] font-semibold tabular-nums sm:w-[92px] sm:text-[14.5px]",
          minutes === 0 && "text-muted-foreground"
        )}
      >
        {formatDuration(minutes)}
      </span>
    </>
  );
}

/** 수면 — 막대에는 그리지 않고 목록 아래 한 줄. 수면 컨텍스트가 없으면 정하는 곳으로 안내 */
function SleepLine({ current, onOpenContextManager }: { current: WeekBalance; onOpenContextManager: () => void }) {
  if (!current.sleepContext) {
    return (
      <button
        type="button"
        onClick={onOpenContextManager}
        className="flex min-h-[46px] items-center gap-2.5 rounded-xl bg-secondary px-3.5 text-left text-[13px] text-muted-foreground hover:bg-black/[0.06] sm:px-4"
      >
        <Moon className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          수면 컨텍스트를 정하면 깨어 있는 시간만 셀 수 있어요 — <span className="text-primary">컨텍스트 관리</span>
        </span>
      </button>
    );
  }

  const average = current.countedDays > 0 ? Math.round(current.sleepMinutes / current.countedDays) : 0;
  return (
    <div className="flex h-12 items-center gap-2.5 rounded-xl bg-secondary px-3.5 sm:h-[46px] sm:px-4">
      <Moon weight="bold" className="size-4 shrink-0" style={{ color: contextColor(current.sleepContext.color) }} aria-hidden="true" />
      <span className="text-[14px] font-semibold">{current.sleepContext.name}</span>
      <span className="flex-1 truncate text-[12.5px] text-muted-foreground sm:text-[13px]">하루 평균 {formatDuration(average)}</span>
      <span className="text-[14px] font-semibold tabular-nums">{formatDuration(current.sleepMinutes)}</span>
    </div>
  );
}
