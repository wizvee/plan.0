"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format, differenceInCalendarDays } from "date-fns";
import { ArrowLeft, Bookmark, Compass, Target } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";

import { useTodos } from "@/lib/app-data/use-todos";
import { useContainers } from "@/lib/app-data/use-containers";
import { useTodoActions } from "@/lib/app-data/todo-actions";
import type { DropTargetData } from "@/lib/dnd/drop-targets";
import { cn } from "@/lib/utils";
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mx-auto w-full max-w-[720px] rounded-lg px-4 py-6 transition-shadow sm:px-6",
        isOver && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <button
        type="button"
        onClick={() => router.push(`/para?kind=${kind}`)}
        className="mb-4 flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        목록으로
      </button>

      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Icon className="size-5" />
        </div>
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setEditingName(false);
            }}
            className="-mx-1 mt-1.5 min-w-0 flex-1 rounded-md bg-transparent px-1 text-[22px] font-bold leading-tight tracking-tight outline-none ring-1 ring-primary"
          />
        ) : (
          <h1
            onClick={startEditingName}
            className="-mx-1 mt-1.5 cursor-pointer rounded-md px-1 text-[22px] font-bold leading-tight tracking-tight hover:bg-accent"
          >
            {container.name}
          </h1>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-6 rounded-lg border border-border bg-card px-4 py-3.5">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Status</span>
          <button
            type="button"
            onClick={toggleStatus}
            className={cn(
              "w-fit rounded-sm px-2 py-0.5 text-[11.5px] font-bold",
              statusDone ? "bg-secondary text-muted-foreground" : "bg-accent text-accent-foreground"
            )}
          >
            {statusLabel}
          </button>
        </div>
        {kind === "project" ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Due date</span>
              <span className="text-[14.5px] font-semibold tabular-nums">{project!.dueDate ?? "미설정"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Progress</span>
              <span className="flex items-center gap-2">
                <span className="h-[5px] w-[100px] overflow-hidden rounded-full bg-secondary">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                </span>
                <span className="text-[14.5px] font-semibold tabular-nums">{progress}%</span>
              </span>
            </div>
          </>
        ) : null}
      </div>

      <div className="mb-4 flex gap-5 border-b border-border">
        {(["overview", "tasks", "files"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => (t === "files" ? void handleSelectFiles() : selectTab(t))}
            className={cn(
              "relative pb-3 text-[14.5px] font-bold text-muted-foreground",
              tab === t &&
                "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary"
            )}
          >
            {t === "overview" ? "Overview" : t === "tasks" ? "Tasks" : "자료"}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-4 border-b border-border py-3">
            <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Start date</span>
            {kind === "project" ? (
              <input
                type="date"
                value={project!.startDate}
                onClick={(e) => e.currentTarget.showPicker?.()}
                onChange={(e) => {
                  if (e.target.value) void updateProject(id, { startDate: e.target.value });
                }}
                className="-mx-1 cursor-pointer rounded-md bg-transparent px-1 text-[14px] tabular-nums text-foreground outline-none hover:bg-accent"
              />
            ) : (
              <span className="text-[14px] tabular-nums">{format(new Date(container.createdAt), "yyyy-MM-dd")}</span>
            )}
          </div>
          {kind === "project" ? (
            <>
              <div className="flex items-center gap-4 border-b border-border py-3">
                <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Due date</span>
                <input
                  type="date"
                  value={project!.dueDate ?? ""}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) => void updateProject(id, { dueDate: e.target.value || null })}
                  className={cn(
                    "-mx-1 cursor-pointer rounded-md bg-transparent px-1 text-[14px] tabular-nums outline-none hover:bg-accent",
                    !project!.dueDate && "text-muted-foreground"
                  )}
                />
              </div>
              <div className="flex items-center gap-4 border-b border-border py-3">
                <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Completion date</span>
                <input
                  type="date"
                  value={project!.completedAt ? project!.completedAt.slice(0, 10) : ""}
                  onClick={(e) => e.currentTarget.showPicker?.()}
                  onChange={(e) =>
                    void updateProject(id, {
                      completedAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                  className={cn(
                    "-mx-1 cursor-pointer rounded-md bg-transparent px-1 text-[14px] tabular-nums outline-none hover:bg-accent",
                    !project!.completedAt && "text-muted-foreground"
                  )}
                />
              </div>
              <div className="flex items-center gap-4 py-3">
                <span className="w-[130px] shrink-0 text-[14px] text-muted-foreground">Days left</span>
                <span className="text-[14px] tabular-nums">
                  {project!.dueDate ? daysLeftLabel(project!.dueDate) : "—"}
                </span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {tab === "tasks" ? (
        <div className="flex flex-col">
          <div className="flex flex-col divide-y divide-border/70">
            {mappedTasks.length === 0 ? (
              <p className="py-6 text-[14px] text-muted-foreground">
                아직 매핑된 할 일이 없습니다. 왼쪽 사이드바(모바일은 하단 Todo 탭)의 &ldquo;할 일 보관함&rdquo;에서 이{" "}
                {PARA_KIND_LABELS[kind]}로 드래그해보세요.
              </p>
            ) : (
              mappedTasks.map((todo) => (
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
              ))
            )}
          </div>

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

      {tab === "files" ? (
        <FilesTab
          mode={filesMode}
          loading={filesLoading}
          error={filesError}
          files={driveFiles}
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
