/**
 * 할 일 사진 도우미 (PHOTOS-PLAN.md) — 주소 만들기와 올리기 전 줄이기. 줄이기는 브라우저에서만 부른다.
 */

/** 원본은 긴 변 2048px, 캘린더용 썸네일은 640px JPEG로 줄여서 올린다. */
const FULL_MAX_SIDE = 2048;
const THUMB_MAX_SIDE = 640;

export type PhotoSize = "thumb" | "full";

export function photoUrl(id: string, size: PhotoSize): string {
  return `/api/photos/${id}?size=${size}`;
}

export function driveFolderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${folderId}`;
}

export function driveFileUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    // 휴대폰 사진의 회전(EXIF) 정보를 반영해서 그린다
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("이 사진 형식은 이 브라우저에서 열 수 없어요. JPEG나 PNG로 올려주세요.");
  }
}

function toJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("사진을 줄이지 못했어요."));
  // 투명한 PNG가 JPEG에서 검게 나오지 않게 흰 바탕을 깐다
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("사진을 줄이지 못했어요."))), "image/jpeg", quality)
  );
}

/** 올릴 원본(2048px) · 썸네일(640px) JPEG. 읽을 수 없는 형식이면 사용자에게 보여줄 메시지로 throw. */
export async function resizeForUpload(file: File): Promise<{ full: Blob; thumb: Blob }> {
  const bitmap = await decode(file);
  try {
    const full = await toJpeg(bitmap, FULL_MAX_SIDE, 0.85);
    const thumb = await toJpeg(bitmap, THUMB_MAX_SIDE, 0.8);
    return { full, thumb };
  } finally {
    bitmap.close();
  }
}

/** "IMG_1234.HEIC" → "IMG_1234.jpg" (Drive에 보이는 이름) */
export function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim();
  return `${base || "photo"}.jpg`;
}
