"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
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
          className="rounded-sm bg-secondary px-2 py-0.5 text-[12px] font-bold text-foreground hover:bg-secondary/70"
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
          className="flex size-[22px] items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground hover:text-foreground"
        >
          <Plus className="size-[11px]" />
        </button>
      )}
    </div>
  );
}

interface FilesTabProps {
  mode: "list" | "edit";
  loading: boolean;
  error: string | null;
  files: DriveFile[];
  showUpload: boolean;
  uploading: boolean;
  onToggleUpload: () => void;
  onUploadFile: (file: File) => void;
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
  loading,
  error,
  files,
  showUpload,
  uploading,
  onToggleUpload,
  onUploadFile,
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
      <div>
        <div className="mb-3.5 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToList}
            className="flex items-center gap-1.5 text-[13px] font-bold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            목록으로
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-bold text-primary-foreground disabled:opacity-50"
          >
            <Check className="size-3.5" />
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>

        {promotedBanner ? (
          <div className="mb-3.5 flex items-center gap-2 rounded-md bg-accent px-3 py-2.5 text-[12.5px] font-bold text-accent-foreground">
            <FileText className="size-3.5 shrink-0" />
            선택한 스크랩으로 새 노트를 만들었어요 — 원본 스크랩은 정리(삭제)됐습니다.
          </div>
        ) : null}

        <input
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="제목"
          className="mb-4 w-full border-none bg-transparent p-0 text-[22px] font-extrabold text-foreground outline-none"
        />

        <span className="mb-2 block text-[12px] font-bold text-muted-foreground">속성</span>
        <div className="mb-1.5 flex flex-col">
          {editingProperties.map((prop, i) => (
            <div key={`${prop.key}-${i}`} className="flex items-start gap-2.5 py-1.5">
              <span className="flex w-[110px] shrink-0 items-center gap-1.5 text-muted-foreground">
                {prop.type === "tag" ? <TagIcon className="size-3.5" /> : <ExternalLink className="size-3.5" />}
                <span className="text-[13.5px]">{prop.key}</span>
              </span>
              {prop.type === "link" ? (
                <div className="flex flex-col gap-0.5">
                  {prop.values.map((v) => (
                    <a
                      key={v}
                      href={v}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[13.5px] text-accent-foreground underline"
                    >
                      {v}
                      <ExternalLink className="size-2.5" />
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
            className="flex items-center gap-1.5 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3" />
            <span className="text-[13px]">속성 추가</span>
          </button>
        </div>

        <textarea
          value={editingBody}
          onChange={(e) => onBodyChange(e.target.value)}
          placeholder="마크다운으로 편하게 적어보세요…"
          className="mt-3.5 h-[300px] w-full resize-none border-none bg-transparent p-0 text-[14.5px] leading-relaxed text-foreground outline-none"
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex justify-end gap-2">
        <button
          type="button"
          onClick={onToggleUpload}
          className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-[13px] font-bold text-foreground"
        >
          <Upload className="size-3.5" />
          업로드
        </button>
        <button
          type="button"
          onClick={onNewNote}
          className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-[13px] font-bold text-accent-foreground"
        >
          <Plus className="size-3.5" />새 노트
        </button>
      </div>

      {showUpload ? (
        <div
          onClick={() => fileInputRef.current?.click()}
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
            "mb-3.5 cursor-pointer rounded-lg border-[1.5px] border-dashed border-border px-4 py-4 text-center text-[13px] text-muted-foreground",
            dragOver && "bg-accent/40"
          )}
        >
          {uploading ? "업로드 중…" : "여기로 파일을 끌어놓거나 클릭해서 선택하세요 (PPT · PDF · 이미지 등)"}
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

      {error ? <p className="py-3 text-[13.5px] text-destructive">{error}</p> : null}

      {loading ? (
        <p className="py-6 text-[14px] text-muted-foreground">불러오는 중…</p>
      ) : files.length === 0 && !error ? (
        <p className="py-6 text-[14px] text-muted-foreground">아직 파일이 없습니다. 업로드하거나 새 노트를 만들어보세요.</p>
      ) : (
        <div className="flex flex-col">
          {files.map((file) => {
            const kind = classifyDriveFile(file);
            const Icon = KIND_ICON[kind];
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onOpenFile(file)}
                className="flex items-center gap-3 rounded-md border-b border-border px-2 py-2.5 text-left hover:bg-accent/40"
              >
                <Icon className="size-[18px] shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[14px]">{file.name}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground">{formatModified(file.modifiedTime)}</span>
                {kind === "md" ? (
                  <span className="shrink-0 text-[11px] font-bold text-muted-foreground">편집</span>
                ) : (
                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
