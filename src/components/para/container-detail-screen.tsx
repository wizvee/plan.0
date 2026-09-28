"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { Bookmark, ChevronLeft, Cloud, Compass, Inbox as InboxIcon, Target } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import type { DropTargetData } from "@/lib/dnd/drop-targets";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR_VAR, CATEGORY_TINT_VAR } from "@/lib/category";
import { useSession } from "@/lib/app-data/app-data-provider";
import {
  PARA_KIND_LABELS,
  type ParaContainer,
  type ParaKind,
} from "@/lib/types";
import { TodoCard } from "@/components/todo-card";
import { ScrapSection } from "@/components/para/scrap-section";
import { FilesTab } from "@/components/para/files-tab";
import type { DriveFile } from "@/lib/google-drive";
import { classifyDriveFile } from "@/lib/drive-file";
import { parseNoteContent, serializeNoteContent, type NoteProperty } from "@/lib/frontmatter";

const KIND_ICON: Record<ParaKind, typeof Target> = {
  project: Target,
  area: Compass,
  resource: Bookmark,
};

function daysLeftLabel(dueDate: string): string {
  const diff = differenceInCalendarDays(new Date(dueDate), new Date());
  if (diff === 0) return "오늘 마감";
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
}

interface ContainerDetailScreenProps {
  kind: ParaKind;
  id: string;
}

export function ContainerDetailScreen({ kind, id }: ContainerDetailScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { todos, setTodos } = useTodos();
  const { projects, updateProject, areas, updateArea, resources, updateResource } = useContainers();
  const actions = useTodoActions();
  const { googleConnected } = useSession();

  // 이 화면도 탭(Overview/Tasks/자료)을 URL(`?tab=`)에서 직접 계산한다 — 다른 화면에 갔다가
  // 뒤로가기를 눌러도 보고 있던 탭 그대로 돌아오게.
  const tabParam = searchParams.get("tab");
  const tab: "overview" | "tasks" | "files" = tabParam === "tasks" || tabParam === "files" ? tabParam : "overview";

  function selectTab(next: "overview" | "tasks" | "files") {
    router.replace(`/para/${kind}/${id}?tab=${next}`, { scroll: false });
  }

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  // 스크랩 선택/승격 (PLANNING.md 9.5)
  const [scrapSelectMode, setScrapSelectMode] = useState(false);
  const [selectedScrapIds, setSelectedScrapIds] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);

  // 자료 탭 — 파일 목록 + 인앱 마크다운 에디터 (PLANNING.md 9.5)
  const [filesMode, setFilesMode] = useState<"list" | "edit">("list");
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
  const [editingProperties, setEditingProperties] = useState<NoteProperty[]>([]);
  const [promotedBanner, setPromotedBanner] = useState(false);
  const [saving, setSaving] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `para:${kind}:${id}`,
    data: { type: "para-container", kind, id } satisfies DropTargetData,
  });

  const project = kind === "project" ? projects.find((p) => p.id === id) : undefined;
  const container =
    kind === "project" ? project : kind === "area" ? areas.find((a) => a.id === id) : resources.find((r) => r.id === id);

  if (!container) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-[15px] text-muted-foreground">불러오는 중...</div>
    );
  }

  const mappedHere = todos.filter((t) =>
    kind === "project" ? t.projectId === id : kind === "area" ? t.areaId === id : t.resourceId === id
  );
  const mappedTasks = mappedHere
    .filter((t) => t.kind === "task")
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  const mappedNotes = mappedHere.filter((t) => t.kind === "note");
  const doneCount = mappedTasks.filter((t) => t.completed).length;
  const progress = mappedTasks.length ? Math.round((doneCount / mappedTasks.length) * 100) : 0;

  const Icon = KIND_ICON[kind];
  const paraContainer = container as ParaContainer;
  const statusLabel =
    kind === "project" ? (project!.status === "active" ? "진행중" : "완료") : paraContainer.archived ? "보관" : "활성";
  const statusDone = kind === "project" ? project!.status === "completed" : paraContainer.archived;

  function toggleStatus() {
    if (kind === "project") {
      const nextStatus = project!.status === "active" ? "completed" : "active";
      void updateProject(id, {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : null,
      });
    } else if (kind === "area") {
      void updateArea(id, { archived: !paraContainer.archived });
    } else {
      void updateResource(id, { archived: !paraContainer.archived });
    }
  }

  function startEditingName() {
    setNameDraft(container!.name);
    setEditingName(true);
  }

  function commitName() {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (!trimmed || trimmed === container!.name) return;
    if (kind === "project") void updateProject(id, { name: trimmed });
    else if (kind === "area") void updateArea(id, { name: trimmed });
    else void updateResource(id, { name: trimmed });
  }

  function setContainerDriveFolderId(folderId: string) {
    if (kind === "project") void updateProject(id, { driveFolderId: folderId });
    else if (kind === "area") void updateArea(id, { driveFolderId: folderId });
    else void updateResource(id, { driveFolderId: folderId });
  }

  async function ensureDriveFolder(): Promise<string> {
    if (container!.driveFolderId) return container!.driveFolderId;
    const res = await fetch("/api/drive/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, containerId: id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Drive 폴더를 만들지 못했습니다.");
    setContainerDriveFolderId(data.folderId);
    return data.folderId as string;
  }

  async function loadDriveFiles(folderId: string) {
    setFilesLoading(true);
    setFilesError(null);
    try {
      const res = await fetch(`/api/drive/files?folderId=${folderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "파일 목록을 불러오지 못했습니다.");
      setDriveFiles(data.files as DriveFile[]);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "파일 목록을 불러오지 못했습니다.");
    } finally {
      setFilesLoading(false);
    }
  }

  async function handleSelectFiles() {
    selectTab("files");
    setFilesMode("list");
    try {
      const folderId = await ensureDriveFolder();
      await loadDriveFiles(folderId);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Drive 폴더를 만들지 못했습니다.");
    }
  }

  async function handleUploadFile(file: File) {
    setUploading(true);
    setFilesError(null);
    try {
      const folderId = await ensureDriveFolder();
      const form = new FormData();
      form.append("folderId", folderId);
      form.append("file", file);
      const res = await fetch("/api/drive/files", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "업로드에 실패했습니다.");
      setDriveFiles((prev) => [...prev, data.file as DriveFile]);
      setShowUpload(false);
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenFile(file: DriveFile) {
    if (classifyDriveFile(file) !== "md") {
      if (file.webViewLink) window.open(file.webViewLink, "_blank", "noopener,noreferrer");
      return;
    }
    setFilesError(null);
    try {
      const res = await fetch(`/api/drive/notes?fileId=${file.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "노트를 불러오지 못했습니다.");
      const { properties, body } = parseNoteContent(data.content as string);
      setEditingFileId(file.id);
      setEditingTitle(file.name.replace(/\.md$/, ""));
      setEditingBody(body);
      setEditingProperties(properties);
      setPromotedBanner(false);
      setFilesMode("edit");
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "노트를 불러오지 못했습니다.");
    }
  }

  function handleNewNote() {
    setEditingFileId(null);
    setEditingTitle("");
    setEditingBody("");
    setEditingProperties([]);
    setPromotedBanner(false);
    setFilesMode("edit");
  }

  function handleAddTagProperty() {
    setEditingProperties((prev) =>
      prev.some((p) => p.type === "tag") ? prev : [...prev, { key: "태그", type: "tag" as const, values: [] }]
    );
  }

  function handleAddTagValue(propIndex: number, value: string) {
    setEditingProperties((prev) => prev.map((p, i) => (i === propIndex ? { ...p, values: [...p.values, value] } : p)));
  }

  function handleRemoveTagValue(propIndex: number, valueIndex: number) {
    setEditingProperties((prev) =>
      prev.map((p, i) => (i === propIndex ? { ...p, values: p.values.filter((_, vi) => vi !== valueIndex) } : p))
    );
  }

  async function handleSaveFile() {
    setSaving(true);
    setFilesError(null);
    try {
      const content = serializeNoteContent(editingProperties, editingBody);
      const title = editingTitle.trim() || "제목 없음";
      if (editingFileId) {
        const res = await fetch("/api/drive/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: editingFileId, content, title }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "저장에 실패했습니다.");
        const name = title.endsWith(".md") ? title : `${title}.md`;
        setDriveFiles((prev) => prev.map((f) => (f.id === editingFileId ? { ...f, name } : f)));
      } else {
        const folderId = await ensureDriveFolder();
        const createRes = await fetch("/api/drive/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId, title }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error ?? "노트 생성에 실패했습니다.");
        const putRes = await fetch("/api/drive/notes", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: createData.file.id, content }),
        });
        const putData = await putRes.json();
        if (!putRes.ok) throw new Error(putData.error ?? "저장에 실패했습니다.");
        setEditingFileId(createData.file.id as string);
        setDriveFiles((prev) => [...prev, createData.file as DriveFile]);
      }
      setFilesMode("list");
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleStartScrapSelect() {
    setScrapSelectMode(true);
    setSelectedScrapIds([]);
  }

  function handleCancelScrapSelect() {
    setScrapSelectMode(false);
    setSelectedScrapIds([]);
  }

  function handleToggleScrapSelect(scrapId: string) {
    setSelectedScrapIds((prev) => (prev.includes(scrapId) ? prev.filter((x) => x !== scrapId) : [...prev, scrapId]));
  }

  async function handlePromoteScraps() {
    if (selectedScrapIds.length === 0) return;
    setPromoting(true);
    setFilesError(null);
    try {
      const res = await fetch("/api/drive/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, containerId: id, scrapIds: selectedScrapIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "노트 생성에 실패했습니다.");

      const promotedIds = data.promotedScrapIds as string[];
      setTodos((prev) => prev.filter((t) => !promotedIds.includes(t.id)));
      setContainerDriveFolderId(data.folderId as string);
      setDriveFiles((prev) => [...prev, data.file as DriveFile]);

      setScrapSelectMode(false);
      setSelectedScrapIds([]);
      setEditingFileId(data.file.id as string);
      setEditingTitle(data.title as string);
      setEditingBody(data.body as string);
      setEditingProperties(data.properties as NoteProperty[]);
      setPromotedBanner(true);
      selectTab("files");
      setFilesMode("edit");
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "노트 생성에 실패했습니다.");
    } finally {
      setPromoting(false);
    }
  }

  const kindColor = `var(${CATEGORY_COLOR_VAR[kind]})`;
  const kindTint = `var(${CATEGORY_TINT_VAR[kind]})`;
  const summaryFacts =
    kind === "project"
      ? [{ label: "마감일", value: project!.dueDate ? formatDateLabel(project!.dueDate) : "미설정" }]
      : [{ label: "만든 날", value: formatDateLabel(container.createdAt.slice(0, 10)) }];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mx-auto flex w-full max-w-[780px] flex-col rounded-xl px-4 pb-8 pt-4 transition-shadow sm:px-9",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <button
        type="button"
        onClick={() => router.push(`/para?kind=${kind}`)}
        className="-ml-1 flex h-[30px] items-center gap-0.5 self-start rounded-[7px] pl-0.5 pr-2 text-[14px] text-primary hover:bg-black/5"
      >
        <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
        {PARA_KIND_LABELS[kind]}
      </button>

      <div className="mb-4 mt-3.5 flex items-center gap-3.5">
        <div
          className="flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: kindTint, color: kindColor }}
        >
          <Icon className="size-6" strokeWidth={1.8} />
        </div>
        {editingName ? (
          <input
            autoFocus
            aria-label="이름"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            className="-mx-1 min-w-0 flex-1 rounded-md bg-transparent px-1 text-[28px] font-bold tracking-[-0.5px] outline-none ring-1 ring-primary"
          />
        ) : (
          <h1
            onClick={startEditingName}
            title="클릭해서 이름 수정"
            className="-mx-1 cursor-text rounded-md px-1 text-[28px] font-bold tracking-[-0.5px] hover:bg-black/[0.04]"
          >
            {container.name}
          </h1>
        )}
      </div>

      <div className="mb-[18px] flex flex-wrap items-stretch gap-y-3 rounded-xl bg-secondary px-1 py-3">
        <div className="flex flex-col gap-[5px] px-4">
          <span className="text-[11.5px] font-semibold text-muted-foreground">상태</span>
          <button
            type="button"
            onClick={toggleStatus}
            title="눌러서 상태 전환"
            className={cn(
              "h-6 self-start rounded-[5px] px-[9px] text-[12.5px] font-semibold",
              statusDone ? "bg-black/[0.08] text-muted-foreground" : "text-foreground"
            )}
            style={statusDone ? undefined : { backgroundColor: kindTint }}
          >
            {statusLabel}
          </button>
        </div>
        {summaryFacts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-[5px] border-l border-black/[0.08] px-4">
            <span className="text-[11.5px] font-semibold text-muted-foreground">{fact.label}</span>
            <span className="text-[14.5px] font-semibold leading-6 tabular-nums">{fact.value}</span>
          </div>
        ))}
        {kind === "project" ? (
          <div className="flex flex-col gap-[5px] border-l border-black/[0.08] px-4">
            <span className="text-[11.5px] font-semibold text-muted-foreground">진행률</span>
            <span className="flex h-6 items-center gap-2">
              <span className="h-1.5 w-[110px] overflow-hidden rounded-full bg-black/[0.1]">
                <span className="block h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: kindColor }} />
              </span>
              <span className="text-[14.5px] font-semibold tabular-nums">{progress}%</span>
            </span>
          </div>
        ) : null}
      </div>

      <div role="tablist" aria-label="상세 탭" className="mb-4 flex self-start rounded-lg bg-black/[0.06] p-0.5">
        {(["overview", "tasks", "files"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => (t === "files" && googleConnected ? void handleSelectFiles() : selectTab(t))}
            className={cn(
              "h-[30px] min-w-[84px] rounded-md px-3.5 text-[13px] font-semibold text-muted-foreground",
              tab === t && "bg-card text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
            )}
          >
            {t === "overview" ? "개요" : t === "tasks" ? "할 일" : "자료"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <OverviewRow label={kind === "project" ? "시작일" : "만든 날"}>
            {kind === "project" ? (
              <DateInput value={project!.startDate} onChange={(v) => v && void updateProject(id, { startDate: v })} />
            ) : (
              <span className="tabular-nums">{formatDateLabel(container.createdAt.slice(0, 10))}</span>
            )}
          </OverviewRow>
          {kind === "project" ? (
            <>
              <OverviewRow label="마감일">
                <DateInput value={project!.dueDate ?? ""} onChange={(v) => void updateProject(id, { dueDate: v || null })} />
              </OverviewRow>
              <OverviewRow label="완료일">
                <DateInput
                  value={project!.completedAt ? project!.completedAt.slice(0, 10) : ""}
                  onChange={(v) => void updateProject(id, { completedAt: v ? new Date(v).toISOString() : null })}
                />
              </OverviewRow>
              <OverviewRow label="남은 기간" last>
                <span className="tabular-nums">{project!.dueDate ? daysLeftLabel(project!.dueDate) : "—"}</span>
              </OverviewRow>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="flex flex-col gap-[22px]">
          <section>
            <div className="flex items-baseline gap-1.5 px-1 pb-1.5">
              <h2 className="text-[13px] font-bold">할 일</h2>
              <span className="text-[13px] text-muted-foreground">{mappedTasks.length}</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {mappedTasks.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  projects={projects}
                  areas={areas}
                  resources={resources}
                  onToggle={actions.toggle}
                  onRemove={actions.remove}
                  onEdit={actions.edit}
                  onMemoEdit={actions.editMemo}
                  onUrlEdit={actions.editUrl}
                  onAssignPara={actions.assignPara}
                  onConvert={actions.convert}
                />
              ))}
              <p className="flex min-h-[42px] items-center gap-2 px-4 text-[13px] text-muted-foreground">
                <InboxIcon className="size-[15px] shrink-0" strokeWidth={1.8} />
                {mappedTasks.length === 0 ? "아직 연결된 할 일이 없어요. " : ""}Inbox에서 끌어다 놓으면 이{" "}
                {PARA_KIND_LABELS_KO[kind]}에 연결돼요
              </p>
            </div>
          </section>

          <ScrapSection
            scraps={mappedNotes}
            projects={projects}
            areas={areas}
            resources={resources}
            selectMode={scrapSelectMode}
            selectedIds={selectedScrapIds}
            promoting={promoting}
            onStartSelect={handleStartScrapSelect}
            onCancelSelect={handleCancelScrapSelect}
            onToggleSelect={handleToggleScrapSelect}
            onPromote={() => void handlePromoteScraps()}
            onRemove={actions.remove}
            onEdit={actions.edit}
            onMemoEdit={actions.editMemo}
            onUrlEdit={actions.editUrl}
            onAssignPara={actions.assignPara}
            onConvert={actions.convert}
          />
        </div>
      ) : null}

      {tab === "files" && !googleConnected ? (
        <div className="flex flex-col items-center gap-2.5 rounded-xl bg-secondary px-6 py-12 text-center">
          <Cloud className="size-[34px] text-muted-foreground/70" strokeWidth={1.6} />
          <span className="text-[16px] font-semibold">Google Drive가 연결되지 않았어요</span>
          <span className="max-w-[360px] text-[13.5px] leading-normal text-muted-foreground">
            연결하면 이 {PARA_KIND_LABELS_KO[kind]} 전용 폴더에 파일과 노트를 모아둘 수 있어요.
          </span>
          <a
            href={`/api/auth/google?next=${encodeURIComponent(`/para/${kind}/${id}`)}`}
            className="mt-1.5 flex h-8 items-center rounded-lg bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground"
          >
            Google Drive 연결
          </a>
        </div>
      ) : null}

      {tab === "files" && googleConnected ? (
        <FilesTab
          mode={filesMode}
          loading={filesLoading}
          error={filesError}
          files={driveFiles}
          folderLabel={`Drive › ${container.name}`}
          showUpload={showUpload}
          uploading={uploading}
          onToggleUpload={() => setShowUpload((v) => !v)}
          onUploadFile={(file) => void handleUploadFile(file)}
          onOpenFile={(file) => void handleOpenFile(file)}
          onNewNote={handleNewNote}
          editingTitle={editingTitle}
          editingBody={editingBody}
          editingProperties={editingProperties}
          promotedBanner={promotedBanner}
          saving={saving}
          onTitleChange={setEditingTitle}
          onBodyChange={setEditingBody}
          onAddTagProperty={handleAddTagProperty}
          onAddTagValue={handleAddTagValue}
          onRemoveTagValue={handleRemoveTagValue}
          onBackToList={() => setFilesMode("list")}
          onSave={() => void handleSaveFile()}
        />
      ) : null}
    </div>
  );
}

const PARA_KIND_LABELS_KO: Record<ParaKind, string> = { project: "프로젝트", area: "영역", resource: "리소스" };

/** "2026. 10. 15." */
function formatDateLabel(dateKey: string): string {
  return format(new Date(`${dateKey}T00:00:00`), "yyyy. M. d.");
}

function OverviewRow({ label, last, children }: { label: string; last?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex min-h-[46px] items-center px-4 text-[14px]", !last && "border-b border-black/[0.06]")}>
      <span className="w-[140px] shrink-0 text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function DateInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      value={value}
      onClick={(e) => e.currentTarget.showPicker?.()}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "-mx-1 cursor-pointer rounded-md bg-transparent px-1 tabular-nums outline-none hover:bg-black/[0.04]",
        !value && "text-muted-foreground"
      )}
    />
  );
}
