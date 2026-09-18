import type { DriveFile } from "@/lib/google-drive";

export type DriveFileKind = "md" | "pdf" | "pptx" | "image" | "other";

export function classifyDriveFile(file: Pick<DriveFile, "name" | "mimeType">): DriveFileKind {
  if (file.mimeType === "text/markdown" || file.name.endsWith(".md")) return "md";
  if (file.mimeType === "application/pdf" || file.name.endsWith(".pdf")) return "pdf";
  if (
    file.mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    file.name.endsWith(".pptx") ||
    file.name.endsWith(".ppt")
  ) {
    return "pptx";
  }
  if (file.mimeType.startsWith("image/")) return "image";
  return "other";
}

export function formatModified(modifiedTime: string | null): string {
  if (!modifiedTime) return "";
  const d = new Date(modifiedTime);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
