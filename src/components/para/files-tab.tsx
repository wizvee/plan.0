"use client";

import { useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  Cloud,
  ExternalLink,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  Plus,
  Presentation,
  Tag as TagIcon,
  Upload,
} from "lucide-react";

import { classifyDriveFile, formatModified } from "@/lib/drive-file";
import type { DriveFile } from "@/lib/google-drive";
import type { NoteProperty } from "@/lib/frontmatter";
import { cn } from "@/lib/utils";

const KIND_ICON = { md: FileText, pdf: FileText, pptx: Presentation, image: ImageIcon, other: FileText } as const;

function TagPropertyValues({
  values,
  onAdd,
  onRemove,
}: {
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) onAdd(trimmed);
    setDraft("");
    setAdding(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v, i) => (
        <button
          key={`${v}-${i}`}
          type="button"
          onClick={() => onRemove(i)}
          title="눌러서 삭제"
          className="flex h-6 items-center rounded-[5px] bg-accent px-2 text-[12.5px] font-medium text-accent-foreground hover:bg-accent/70"
        >
          {v}
        </button>
      ))}
      {adding ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft("");
              setAdding(false);
            }
          }}
          className="w-20 rounded-sm border-b border-primary bg-transparent px-0.5 text-[12px] outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-label="태그 추가"
          className="flex size-6 items-center justify-center rounded-[5px] border border-dashed border-black/20 text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-[11px]" />
        </button>
      )}
    </div>
  );
}

const KIND_TILE: Record<keyof typeof KIND_ICON, string> = {
  md: "bg-secondary text-foreground/70",
  pdf: "bg-destructive/10 text-destructive",
  pptx: "bg-warning/15 text-warning",
  image: "bg-category-area-tint text-category-area",
  other: "bg-secondary text-muted-foreground",
};

interface FilesTabProps {
  mode: "list" | "edit";
  /** 목록 위에 보여줄 Drive 폴더 위치 (예: "Drive › 포트폴리오 리뉴얼") */
  folderLabel: string;
  loading: boolean;
  error: string | null;
  files: DriveFile[];
  showUpload: boolean;
  uploading: boolean;
  importing: boolean;
  onToggleUpload: () => void;
  onUploadFile: (file: File) => void;
  onImport: () => void;
  onOpenFile: (file: DriveFile) => void;
  onNewNote: () => void;

  editingTitle: string;
  editingBody: string;
  editingProperties: NoteProperty[];
  promotedBanner: boolean;
  saving: boolean;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAddTagProperty: () => void;
  onAddTagValue: (propIndex: number, value: string) => void;
  onRemoveTagValue: (propIndex: number, valueIndex: number) => void;
  onBackToList: () => void;
  onSave: () => void;
}

export function FilesTab({
  mode,
  folderLabel,
  loading,
  error,
  files,
  showUpload,
  uploading,
  importing,
  onToggleUpload,
  onUploadFile,
  onImport,
  onOpenFile,
  onNewNote,
  editingTitle,
  editingBody,
  editingProperties,
  promotedBanner,
  saving,
  onTitleChange,
  onBodyChange,
  onAddTagProperty,
  onAddTagValue,
  onRemoveTagValue,
  onBackToList,
  onSave,
}: FilesTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  if (mode === "edit") {
    return (
      <div className="flex flex-col">
        <div className="mb-3.5 flex items-center">
          <button
            type="button"
            onClick={onBackToList}
            className="-ml-1 flex h-[30px] items-center gap-0.5 rounded-[7px] pl-0.5 pr-2 text-[14px] text-primary hover:bg-black/5"
          >
            <ChevronLeft className="size-[18px]" strokeWidth={2.2} />
            자료
          </button>
          <span className="ml-auto mr-2.5 hidden text-[12.5px] text-muted-foreground sm:inline">Drive에 .md로 저장</span>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex h-[30px] items-center gap-1.5 rounded-[7px] bg-primary px-4 text-[13px] font-semibold text-primary-foreground disabled:opacity-50 max-sm:ml-auto"
          >
            <Check className="size-3.5" strokeWidth={2.4} />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>

        {promotedBanner ? (
          <div className="mb-3.5 flex items-center gap-2 rounded-lg bg-accent px-3 py-2.5 text-[12.5px] font-semibold text-accent-foreground">
            <FileText className="size-3.5 shrink-0" />
            선택한 스크랩으로 새 노트를 만들었어요 — 원본 스크랩은 정리(삭제)됐습니다.
          </div>
        ) : null}

        {error ? <p className="mb-3 text-[13.5px] text-destructive">{error}</p> : null}

        <input
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="제목"
          aria-label="제목"
          className="mb-3.5 w-full border-none bg-transparent p-0 text-[26px] font-bold tracking-[-0.4px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />

        <div className="mb-4 flex flex-col border-y border-border py-1.5">
          {editingProperties.map((prop, i) => (
            <div key={`${prop.key}-${i}`} className="flex min-h-[34px] items-center gap-2">
              <span className="flex w-[110px] shrink-0 items-center gap-1.5 text-[13.5px] text-muted-foreground">
                {prop.type === "tag" ? <TagIcon className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                {prop.key}
              </span>
              {prop.type === "link" ? (
                <div className="flex min-w-0 flex-col gap-0.5">
                  {prop.values.map((v) => (
                    <a
                      key={v}
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[13.5px] text-primary hover:underline"
                    >
                      {v}
                    </a>
                  ))}
                </div>
              ) : (
                <TagPropertyValues
                  values={prop.values}
                  onAdd={(value) => onAddTagValue(i, value)}
                  onRemove={(valueIndex) => onRemoveTagValue(i, valueIndex)}
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={onAddTagProperty}
            className="-ml-1.5 flex h-[30px] items-center gap-1.5 self-start rounded-md px-1.5 text-[13px] text-muted-foreground hover:bg-black/5 hover:text-foreground"
          >
            <Plus className="size-3" />
            속성 추가
          </button>
        </div>

        <textarea
          value={editingBody}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="마크다운으로 편하게 적어보세요…"
          aria-label="본문 (마크다운)"
          className="h-[320px] w-full resize-none border-none bg-transparent p-0 font-mono text-[13.5px] leading-[1.7] text-foreground outline-none"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <Cloud className="size-3.5 shrink-0 text-category-area" strokeWidth={1.8} />
          <span className="truncate">{folderLabel}</span>
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onImport}
          disabled={importing}
          className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-[7px] border border-black/10 bg-card px-3 text-[13px] font-medium hover:bg-black/5 disabled:opacity-50"
        >
          <FolderOpen className="size-3.5" strokeWidth={1.8} />
          {importing ? "가져오는 중…" : "Drive에서 가져오기"}
        </button>
        <button
          type="button"
          onClick={onToggleUpload}
          aria-pressed={showUpload}
          className={cn(
            "flex h-[30px] shrink-0 items-center gap-1.5 rounded-[7px] border border-black/10 bg-card px-3 text-[13px] font-medium hover:bg-black/5",
            showUpload && "bg-secondary"
          )}
        >
          <Upload className="size-3.5" strokeWidth={1.8} />
          업로드
        </button>
        <button
          type="button"
          onClick={onNewNote}
          className="flex h-[30px] shrink-0 items-center gap-1.5 rounded-[7px] bg-primary px-3 text-[13px] font-semibold text-primary-foreground"
        >
          <Plus className="size-3.5" strokeWidth={2.2} />새 노트
        </button>
      </div>

      {showUpload ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onUploadFile(file);
          }}
          className={cn(
            "flex min-h-[76px] cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-dashed border-primary/45 bg-primary/[0.04] px-4 text-center text-[13.5px] text-accent-foreground",
            dragOver && "bg-primary/10"
          )}
        >
          {uploading ? "업로드 중…" : "여기로 파일을 끌어놓거나 클릭해서 선택 (PPT · PDF · 이미지 등)"}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUploadFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {error ? <p className="text-[13.5px] text-destructive">{error}</p> : null}

      {loading ? (
        <p className="py-6 text-[14px] text-muted-foreground">불러오는 중…</p>
      ) : files.length === 0 && !error ? (
        <p className="py-6 text-[14px] text-muted-foreground">아직 파일이 없어요. 업로드하거나 새 노트를 만들어보세요.</p>
      ) : files.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {files.map((file, index) => {
            const kind = classifyDriveFile(file);
            const Icon = KIND_ICON[kind];
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onOpenFile(file)}
                className={cn(
                  "flex min-h-[52px] w-full items-center gap-3 px-4 text-left hover:bg-black/[0.03]",
                  index < files.length - 1 && "border-b border-black/[0.06]"
                )}
              >
                <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-[7px]", KIND_TILE[kind])}>
                  <Icon className="size-4" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1 truncate text-[14px]">{file.name}</span>
                <span className="shrink-0 text-[12.5px] tabular-nums text-muted-foreground">{formatModified(file.modifiedTime)}</span>
                <span className="flex w-11 shrink-0 justify-end text-[12.5px] font-medium text-primary">
                  {kind === "md" ? "편집" : <ExternalLink className="size-[15px] text-muted-foreground" strokeWidth={1.8} />}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
