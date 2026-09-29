"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Cloud, ExternalLink, Folder, ImageOff, ImagePlus, Loader2, Plus, Star } from "lucide-react";

import { PhotoViewer } from "@/components/photo/photo-viewer";
import { useSession } from "@/lib/app-data/app-data-provider";
import { usePhotos } from "@/lib/app-data/use-photos";
import { driveFolderUrl, photoUrl } from "@/lib/photos";

/**
 * 할 일 상세 팝업의 "사진" 탭 — 3열 정사각 그리드, ★ 대표, 추가, 누르면 크게 보기. (PHOTOS-PLAN.md, 시안 ③)
 * 사진은 Google Drive에 저장하므로 Drive가 연결돼 있지 않으면 연결 안내만 보인다(PARA 자료 탭과 같은 모양).
 */
export function PhotoTab({ todoId }: { todoId: string }) {
  const { googleConnected } = useSession();
  const pathname = usePathname();
  const { photosOf, coverOf, uploadPhoto, removePhoto, setCoverPhoto } = usePhotos();
  const photos = photosOf(todoId);
  const cover = coverOf(todoId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const [viewing, setViewing] = useState<number | null>(null);

  if (!googleConnected) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2.5 rounded-xl bg-secondary px-6 text-center">
        <Cloud className="size-[30px] text-muted-foreground/70" strokeWidth={1.6} />
        <span className="text-[15px] font-semibold">Google Drive가 연결되지 않았어요</span>
        <span className="max-w-[300px] text-[13px] leading-normal text-muted-foreground">
          연결하면 이 할 일의 사진을 내 Drive에 모아두고 캘린더에서 볼 수 있어요.
        </span>
        <a
          href={`/api/auth/google?next=${encodeURIComponent(pathname)}`}
          className="mt-1 flex h-8 items-center rounded-lg bg-primary px-4 text-[13.5px] font-semibold text-primary-foreground"
        >
          Google Drive 연결
        </a>
      </div>
    );
  }

  async function handleFiles(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (list.length === 0) return;
    setError(null);
    setUploading((n) => n + list.length);
    // 한 장씩 차례로 — 첫 사진이 대표가 되고, 같은 폴더를 두 번 만들지 않게
    for (const file of list) {
      try {
        await uploadPhoto(todoId, file);
      } catch (err) {
        setError(err instanceof Error ? err.message : "사진을 올리지 못했어요.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function handleRemove(id: string) {
    const index = photos.findIndex((p) => p.id === id);
    // 지운 뒤엔 다음 사진을 보여주고, 남은 게 없으면 닫는다
    setViewing(photos.length <= 1 ? null : Math.min(index, photos.length - 2));
    try {
      await removePhoto(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진을 지우지 못했어요.");
    }
  }

  const folderId = photos[0]?.driveFolderId ?? null;
  const viewingPhoto = viewing !== null ? photos[viewing] : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex h-[22px] shrink-0 items-center gap-2 px-0.5">
        <Folder className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} aria-hidden="true" />
        {folderId ? (
          <a
            href={driveFolderUrl(folderId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-w-0 flex-1 items-center gap-1 truncate text-[11.5px] text-muted-foreground hover:text-primary"
          >
            <span className="truncate">Google Drive › PLAN.0 › 사진</span>
            <ExternalLink className="size-3 shrink-0" strokeWidth={1.8} />
          </a>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
            Google Drive › PLAN.0 › 사진에 저장돼요
          </span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-primary hover:opacity-80"
        >
          <Plus className="size-3.5" strokeWidth={2} />
          추가
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />

      {/* 스크롤은 바깥 칸이 맡는다 — 그리드 자체를 줄이면(overflow가 있는 정사각 칸은 최소 높이가 0이라) 줄이 겹쳐 보였다 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setViewing(index)}
              aria-label={`사진 ${index + 1}${photo.id === cover?.id ? " (대표)" : ""} 크게 보기`}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {failed.has(photo.id) ? (
                <ImageOff className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" strokeWidth={1.6} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- Drive에서 읽어오는 사용자 사진이라 next/image 최적화 대상이 아님
                <img
                  src={photoUrl(photo.id, "thumb")}
                  alt=""
                  loading="lazy"
                  onError={() => setFailed((prev) => new Set(prev).add(photo.id))}
                  className="size-full object-cover"
                />
              )}
              {photo.id === cover?.id ? (
                <span className="absolute left-1.5 top-1.5 flex h-5 items-center gap-[3px] rounded-full bg-black/55 pl-[5px] pr-[7px] text-[10.5px] font-semibold text-white">
                  <Star className="size-[11px] fill-current" strokeWidth={1.5} />
                  대표
                </span>
              ) : null}
            </button>
          ))}
          {Array.from({ length: uploading }).map((_, i) => (
            <div key={`uploading-${i}`} className="flex aspect-square items-center justify-center rounded-lg bg-muted">
              <Loader2 className="size-5 animate-spin text-muted-foreground" strokeWidth={1.8} aria-label="올리는 중" />
            </div>
          ))}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-[1.5px] border-dashed border-black/[0.18] text-[12px] text-muted-foreground hover:bg-black/[0.03]"
          >
            <ImagePlus className="size-5" strokeWidth={1.8} />
            사진 추가
          </button>
        </div>
      </div>

      {error ? <p className="shrink-0 px-0.5 text-[12px] text-destructive">{error}</p> : null}

      {viewingPhoto && viewing !== null ? (
        <PhotoViewer
          photos={photos}
          index={viewing}
          isCover={viewingPhoto.id === cover?.id}
          onIndexChange={setViewing}
          onSetCover={(id) => void setCoverPhoto(id)}
          onRemove={(id) => void handleRemove(id)}
          onClose={() => setViewing(null)}
        />
      ) : null}
    </div>
  );
}
