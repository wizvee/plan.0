"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, X } from "@/components/icons";

import { cn } from "@/lib/utils";
import { useShellUI } from "@/lib/shell-ui";
import { useSearch, useSearchIndex } from "@/lib/app-data/use-search";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import type { LineHit, ParaHit, TodoHit } from "@/lib/search";
import type { MarkState } from "@/lib/memo-marks";
import type { Todo } from "@/lib/types";
import { chipMarks, countMarks, MARK_CHIPS, MarkChipButtons, ShowDoneSwitch, type MarkChip } from "@/components/search/mark-chips";
import { INLINE_CODE_CLASS } from "@/components/inline-text";
import { TodoDetailById } from "@/components/todo-detail-by-id";
import type { DetailTab } from "@/components/todo-detail-modal";
import {
  EmojiLineRow,
  LineGroupHeader,
  MarkLineRow,
  ParaResultCard,
  TodoResultCard,
} from "@/components/search/search-result";

/** 처음에 보이는 결과 수 — 나머지는 "더 보기" (SEARCH-PLAN.md 3-5) */
const PAGE = 30;

type Chip = MarkChip;

/** 키보드로 고를 수 있는 결과 하나 */
export type SearchItem = ParaHit | TodoHit | LineHit;

/** 결과를 열 때 할 일 팝업의 탭 — 일치한 곳(메모 · URL → 메모 탭, 하위 할 일 → 하위 할 일 탭). 제목이면 평소대로 */
function tabFor(item: TodoHit | LineHit): DetailTab | undefined {
  const source = item.type === "todo" ? item.bestSource : item.source;
  if (source === "memo" || source === "url") return "memo";
  if (source === "subtask") return "subtasks";
  return undefined;
}

/**
 * 검색 패널 (SEARCH-PLAN.md, 시안 https://claude.ai/artifact/EXRxgXo2Cpn1oNFvj9DBCx).
 * 데스크톱은 가운데 팝업(위에서 72px · 폭 640px), 모바일은 전체 화면. ⌘K / Ctrl+K · 레일 검색 버튼으로 연다.
 * 셸에 한 번만 마운트되고, 검색어 · 칩은 닫았다 열어도 남는다(스포트라이트처럼).
 */
export function SearchPanel() {
  const { searchOpen, closeSearch, toggleSearch } = useShellUI();
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState<Chip | null>(null);
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 한글 입력 상태에서도 되도록 물리 키(code)로 본다
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && (e.code === "KeyK" || e.key.toLowerCase() === "k")) {
        e.preventDefault();
        toggleSearch();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSearch]);

  if (!searchOpen) return null;
  return createPortal(
    <SearchDialog
      query={query}
      onQueryChange={setQuery}
      chip={chip}
      onChipChange={setChip}
      showDone={showDone}
      onShowDoneChange={setShowDone}
      onClose={closeSearch}
    />,
    document.body
  );
}

function SearchDialog({
  query,
  onQueryChange,
  chip,
  onChipChange,
  showDone,
  onShowDoneChange,
  onClose,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  chip: Chip | null;
  onChipChange: (chip: Chip | null) => void;
  showDone: boolean;
  onShowDoneChange: (show: boolean) => void;
  onClose: () => void;
}) {
  const index = useSearchIndex();
  const { editMemo } = useTodoActions();
  const router = useRouter();
  // 결과로 연 할 일 팝업 — 검색 패널 위에 뜨고, 닫으면 검색으로 돌아온다
  const [openTodo, setOpenTodo] = useState<{ id: string; tab: DetailTab | undefined } | null>(null);
  const marks = useMemo<MarkState[]>(() => chipMarks(chip, showDone), [chip, showDone]);
  const result = useSearch(index, query, marks);
  // 칩 개수 = 열린 줄 (확인할 것 = [ ], 질문 = [?])
  const counts = useMemo(() => countMarks(index), [index]);

  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState(0);
  // 검색어 · 칩이 바뀌면 첫 결과부터
  const resetKey = `${query}\u0000${chip}\u0000${showDone}`;
  const [prevResetKey, setPrevResetKey] = useState(resetKey);
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setSelected(0);
    setLimit(PAGE);
  }

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 열릴 때 지난 검색어를 전부 선택 — 바로 새로 치거나 그대로 이어 쓸 수 있게
  useEffect(() => {
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 안쪽(답 입력칸 등)이 Esc를 처리했거나 할 일 팝업이 열려 있으면(팝업만 닫힘) 패널은 그대로
      if (e.key === "Escape" && !e.defaultPrevented && !openTodo) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, openTodo]);

  const items: SearchItem[] = useMemo(() => {
    if (result.mode === "ranked") return [...result.paras, ...result.todos.slice(0, limit)];
    if (result.mode === "lines") return result.lines.slice(0, limit);
    return [];
  }, [result, limit]);
  const total = result.mode === "ranked" ? result.paras.length + result.todos.length : result.mode === "lines" ? result.lines.length : 0;
  const hasMore = total > items.length;
  const current = Math.min(selected, Math.max(items.length - 1, 0));

  // 고른 결과가 보이게
  useEffect(() => {
    listRef.current?.querySelector(`#search-item-${current}`)?.scrollIntoView({ block: "nearest" });
  }, [current]);

  function openItem(item: SearchItem) {
    if (item.type === "para") {
      router.push(`/para/${item.kind}/${item.id}`);
      onClose();
      return;
    }
    setOpenTodo({ id: item.todo.id, tab: tabFor(item) });
  }

  const closeTodo = useCallback(() => {
    setOpenTodo(null);
    // 팝업이 닫힌 뒤 검색어 칸으로 — 바로 ↑↓ · 다시 검색
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.nativeEvent.isComposing) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      const next = e.key === "ArrowDown" ? current + 1 : current - 1;
      setSelected((next + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[current];
      if (item) openItem(item);
    }
  }

  function editLineMemo(todo: Todo, memo: string) {
    const trimmed = memo.trim();
    if (trimmed !== (todo.memo ?? "")) editMemo(todo.id, trimmed);
  }

  const words = result.mode === "empty" ? [] : result.words;
  const idle = result.mode === "empty" && !chip;

  let body: ReactNode;
  if (idle) {
    body = <SearchHelp />;
  } else if (items.length === 0) {
    body = <NoResults chip={chip} showDone={showDone} />;
  } else if (result.mode === "ranked") {
    const paraCount = Math.min(result.paras.length, items.length);
    body = (
      <>
        {result.paras.length > 0 ? <SectionLabel label="PARA" /> : null}
        <div className="flex flex-col gap-2">
          {items.slice(0, paraCount).map((item, i) => (
            <ParaResultCard
              key={`p${(item as ParaHit).kind}${(item as ParaHit).id}`}
              hit={item as ParaHit}
              words={words}
              id={`search-item-${i}`}
              selected={i === current}
              onOpen={() => openItem(item)}
              onHover={() => setSelected(i)}
            />
          ))}
        </div>
        {result.todos.length > 0 ? <SectionLabel label="할 일 · 메모" right={`${result.todos.length}개`} /> : null}
        <div className="flex flex-col gap-2">
          {items.slice(paraCount).map((item, k) => {
            const i = paraCount + k;
            return (
              <TodoResultCard
                key={(item as TodoHit).todo.id}
                hit={item as TodoHit}
                words={words}
                id={`search-item-${i}`}
                selected={i === current}
                onOpen={() => openItem(item)}
                onHover={() => setSelected(i)}
              />
            );
          })}
        </div>
      </>
    );
  } else {
    const lines = items as LineHit[];
    if (marks.length > 0) {
      // 줄 표시 — 할 일별로 묶어서 (같은 할 일의 줄은 정렬상 붙어 있다)
      const groups: { todo: Todo; hit: LineHit; start: number; lines: LineHit[] }[] = [];
      lines.forEach((line, i) => {
        const last = groups[groups.length - 1];
        if (last && last.todo.id === line.todo.id) last.lines.push(line);
        else groups.push({ todo: line.todo, hit: line, start: i, lines: [line] });
      });
      body = (
        <>
          {groups.map((group) => (
            <Fragment key={`${group.todo.id}-${group.start}`}>
              <LineGroupHeader todo={group.todo} para={group.hit.para} words={words} />
              <div className="overflow-hidden rounded-[10px] bg-card shadow-[0_0_0_1px_var(--border)]">
                {group.lines.map((line, k) => {
                  const i = group.start + k;
                  return (
                    <MarkLineRow
                      key={`${line.todo.id}:${line.lineIndex}`}
                      hit={line}
                      words={words}
                      id={`search-item-${i}`}
                      first={k === 0}
                      selected={i === current}
                      onOpen={() => openItem(line)}
                      onHover={() => setSelected(i)}
                      onEditMemo={editLineMemo}
                    />
                  );
                })}
              </div>
            </Fragment>
          ))}
        </>
      );
    } else {
      body = (
        <>
          <SectionLabel label={`${words.join(" ")}가 들어간 줄`} right="최근 순" />
          <div className="overflow-hidden rounded-[10px] bg-card shadow-[0_0_0_1px_var(--border)]">
            {lines.map((line, i) => (
              <EmojiLineRow
                key={`${line.todo.id}:${line.source}:${line.lineIndex ?? line.subtask?.id ?? ""}`}
                hit={line}
                words={words}
                id={`search-item-${i}`}
                first={i === 0}
                selected={i === current}
                onOpen={() => openItem(line)}
                onHover={() => setSelected(i)}
              />
            ))}
          </div>
        </>
      );
    }
  }

  const footerLeft = idle ? (
    <span className="flex items-center gap-1">
      <Kbd>{isMac() ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd> 어디서나 열기
    </span>
  ) : total === 0 ? (
    "결과 없음"
  ) : result.mode === "lines" ? (
    `줄 ${total}개`
  ) : (
    `결과 ${total}개`
  );

  return (
    <>
      {/* 데스크톱 뒤 배경 — 누르면 닫힘. 모바일은 전체 화면이라 없음 */}
      <div className="fixed inset-0 z-[55] hidden bg-black/30 sm:block" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="검색"
        className={cn(
          "fixed inset-0 z-[55] flex flex-col bg-background",
          "sm:inset-auto sm:left-1/2 sm:top-[72px] sm:max-h-[min(640px,calc(100dvh-96px))] sm:w-[640px] sm:-translate-x-1/2 sm:overflow-hidden sm:rounded-xl sm:bg-popover/[0.97] sm:shadow-[0_24px_60px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.05)] sm:backdrop-blur"
        )}
      >
        <div className="flex shrink-0 items-center gap-2.5 px-4 pb-1.5 pt-4 sm:h-14 sm:border-b sm:border-border sm:py-0 sm:pl-[18px]">
          <label className="flex h-[38px] min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-black/[0.06] px-2.5 sm:h-auto sm:gap-2.5 sm:bg-transparent sm:px-0">
            <MagnifyingGlass className="size-[18px] shrink-0 text-muted-foreground sm:size-5" aria-hidden="true" />
            <input
              ref={inputRef}
              autoFocus
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="할 일 · 메모 · 하위 할 일 · PARA 검색"
              aria-label="검색어"
              aria-controls="search-results"
              aria-activedescendant={items.length > 0 ? `search-item-${current}` : undefined}
              enterKeyHint="search"
              className="min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-muted-foreground sm:text-[17px] [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  inputRef.current?.focus();
                }}
                aria-label="검색어 지우기"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-muted-foreground/50 text-white sm:size-5"
              >
                <X weight="bold" className="size-2.5" aria-hidden="true" />
              </button>
            ) : null}
          </label>
          <span className="hidden sm:inline-flex">
            <Kbd>esc</Kbd>
          </span>
          <button type="button" onClick={onClose} className="shrink-0 text-[16px] text-primary sm:hidden">
            취소
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 px-4 pb-1 pt-2.5">
          <MarkChipButtons
            chip={chip}
            counts={counts}
            onChange={(next) => {
              onChipChange(next);
              inputRef.current?.focus();
            }}
          />
          {chip ? <ShowDoneSwitch checked={showDone} onChange={onShowDoneChange} className="ml-auto" /> : null}
        </div>

        <div id="search-results" role="listbox" aria-label="검색 결과" ref={listRef} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {body}
          {hasMore ? (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className="mt-3 w-full rounded-lg py-2 text-[13.5px] font-semibold text-primary hover:bg-accent"
            >
              더 보기 ({total - items.length}개)
            </button>
          ) : null}
        </div>

        <div className="hidden h-9 shrink-0 items-center justify-between border-t border-border px-4 text-[12px] text-muted-foreground sm:flex">
          <span>{footerLeft}</span>
          <span className="flex items-center gap-[5px]">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> 이동 · <Kbd>↵</Kbd> 열기 · <Kbd>esc</Kbd> 닫기
          </span>
        </div>
      </div>
      {openTodo ? <TodoDetailById todoId={openTodo.id} initialTab={openTodo.tab} onClose={closeTodo} /> : null}
    </>
  );
}

/** 단축키 표시용 — 패널은 열린 뒤(브라우저)에만 그려지므로 navigator를 바로 읽어도 된다 */
function isMac(): boolean {
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] bg-black/[0.06] px-1 font-[system-ui] text-[11px] text-foreground">
      {children}
    </kbd>
  );
}

function SectionLabel({ label, right }: { label: string; right?: string }) {
  return (
    <div className="flex justify-between px-1 pb-1.5 pt-3 text-[12px] font-semibold text-muted-foreground">
      <span>{label}</span>
      {right ? <span className="font-medium">{right}</span> : null}
    </div>
  );
}

/** 검색어가 없을 때 — "이렇게 찾아요" (시안 ①) */
function SearchHelp() {
  const rows: { icon: ReactNode; title: ReactNode; sub: ReactNode }[] = [
    {
      icon: <MagnifyingGlass weight="bold" className="size-4 text-muted-foreground" aria-hidden="true" />,
      title: "할 일 · 하위 할 일 · 메모 · PARA 이름에서 찾아요",
      sub: "검색어 단어의 절반 이상이 맞으면 나와요 — 조사는 떼고 봐요(성능은 → 성능)",
    },
    {
      icon: <span className="font-mono text-[11px] font-bold text-muted-foreground">{"{ }"}</span>,
      title: (
        <>
          코드도 그대로 — <code className={INLINE_CODE_CLASS}>RESP_DIV_TAB</code>
        </>
      ),
      sub: (
        <>
          하이픈 · 밑줄은 없어도 돼요(<code className={INLINE_CODE_CLASS}>ci-ds</code> ={" "}
          <code className={INLINE_CODE_CLASS}>cids</code>)
        </>
      ),
    },
    {
      icon: <span className="text-[14px]" aria-hidden="true">📝</span>,
      title: "이모지만 치면 그 이모지가 들어간 줄 전부",
      sub: "태그처럼 — 📝 결과 메모 · 💡 아이디어",
    },
  ];
  return (
    <>
      <SectionLabel label="이렇게 찾아요" />
      <div className="overflow-hidden rounded-[10px] bg-card shadow-[0_0_0_1px_var(--border)]">
        {rows.map((row, i) => (
          <div key={i} className={cn("flex items-start gap-3 px-3.5 py-[11px]", i > 0 && "border-t border-border")}>
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-muted">{row.icon}</span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[14px] font-semibold">{row.title}</span>
              <span className="text-[12.5px] text-muted-foreground">{row.sub}</span>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

/** 결과 없음 (시안 ⑤) — 칩만 켰을 때는 "열린 줄 없음" */
function NoResults({ chip, showDone }: { chip: Chip | null; showDone: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2.5 px-10 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MagnifyingGlass className="size-6 text-muted-foreground/70" aria-hidden="true" />
      </span>
      {chip ? (
        <span className="text-[16px] font-semibold">
          {showDone ? `${MARK_CHIPS[chip].label} 줄이 없어요` : `남은 ${MARK_CHIPS[chip].label}이 없어요`}
        </span>
      ) : (
        <>
          <span className="text-[16px] font-semibold">맞는 기록이 없어요</span>
          <span className="text-[13px] leading-normal text-muted-foreground">
            원문에 적은 단어로 찾아요. 단어 수를 줄이거나
            <br />
            약어 · 원래 이름으로 바꿔 보세요 (예: persist 메모리)
          </span>
        </>
      )}
    </div>
  );
}
