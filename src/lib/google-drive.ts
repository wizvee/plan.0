// 서버 전용. GOOGLE_CLIENT_ID/SECRET 환경변수 없이는 동작하지 않으므로 API route에서만 import한다.
// PLANNING.md 9번 참고: 노트/자료를 DB가 아니라 사용자 개인 Google Drive의 파일로 관리한다.
// refresh token은 환경변수가 아니라 사용자별로 `google_accounts` 테이블에 저장되어 있고
// (앱 안 "Google Drive 연결" 버튼 → /api/auth/google 플로우로 발급), 이 파일의 모든 함수는
// 호출하는 쪽(API route)이 그 사용자의 refresh token을 조회해서 첫 인자로 넘겨준다.
import { Readable } from "node:stream";

import { google, type drive_v3 } from "googleapis";

import type { ParaKind } from "@/lib/types";

function getAppOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET이 설정되지 않았습니다.");
  }
  return { clientId, clientSecret };
}

/** OAuth 연결 플로우(/api/auth/google, /api/auth/google/callback) 전용 — 아직 refresh token이 없는 상태. */
export function createAuthFlowClient(redirectUri: string) {
  const { clientId, clientSecret } = getAppOAuthClient();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getDrive(refreshToken: string): drive_v3.Drive {
  const { clientId, clientSecret } = getAppOAuthClient();
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: client });
}

/** 브라우저의 Google Picker(PLANNING.md 9.9 참고)에 넘겨줄 단기 액세스 토큰을 발급한다.
 * refresh token 자체는 절대 클라이언트로 내려보내지 않고, 매번 여기서 새로 교환한 access token만
 * (수명 ~1시간) 넘긴다. */
export async function getAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = getAppOAuthClient();
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("액세스 토큰을 발급받지 못했습니다.");
  return token;
}

/** Google Picker의 `setAppId`에 넘길 앱 ID(= Cloud 프로젝트 번호). OAuth 클라이언트 ID가
 * `<프로젝트 번호>-<해시>.apps.googleusercontent.com` 형식이라 그 앞부분을 그대로 쓴다 — 따로
 * 환경변수를 늘리지 않으려고. drive.file 스코프에서는 이 값이 없으면 Picker로 파일을 골라도
 * 앱에 접근 권한이 부여되지 않는다(PLANNING.md 9.9 참고). */
export function getPickerAppId(): string {
  const { clientId } = getAppOAuthClient();
  const projectNumber = clientId.split("-")[0];
  if (!/^\d+$/.test(projectNumber)) {
    throw new Error("GOOGLE_CLIENT_ID에서 프로젝트 번호를 읽지 못했습니다.");
  }
  return projectNumber;
}

const KIND_FOLDER_NAME: Record<ParaKind, string> = {
  project: "1-Projects",
  area: "2-Areas",
  resource: "3-Resources",
};

const ROOT_FOLDER_NAME = "PARA";

async function findFolder(drive: drive_v3.Drive, name: string, parentId: string): Promise<string | null> {
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
    spaces: "drive",
  });
  return res.data.files?.[0]?.id ?? null;
}

async function ensureFolder(drive: drive_v3.Drive, name: string, parentId: string): Promise<string> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing;
  const res = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: [parentId] },
    fields: "id",
  });
  if (!res.data.id) throw new Error("Drive 폴더 생성에 실패했습니다.");
  return res.data.id;
}

/** kind/이름에 대응하는 Drive 폴더를 찾고, 없으면 만든 뒤 ID를 반환한다 (PARA/1-Projects/<name> 등). */
export async function ensureContainerFolder(refreshToken: string, kind: ParaKind, name: string): Promise<string> {
  const drive = getDrive(refreshToken);
  // "root"는 이 계정의 내 드라이브 최상위를 가리키는 Drive API 예약어. PARA 폴더 자체도
  // 앱이 직접 만들어서, drive.file 스코프(앱이 만든 파일만 접근)만으로 전체 트리에 접근 가능하다
  // — 사용자가 드라이브에서 직접 만든 폴더를 넘겨받는 방식은 더 넓은(민감한) 스코프가 필요해서 피함.
  const rootFolderId = await ensureFolder(drive, ROOT_FOLDER_NAME, "root");
  const kindFolderId = await ensureFolder(drive, KIND_FOLDER_NAME[kind], rootFolderId);
  return ensureFolder(drive, name, kindFolderId);
}

const PHOTO_ROOT_FOLDER_NAME = "PLAN.0";
/** 2026-09-29 앱 이름을 PLAN.0으로 바꾸기 전의 폴더 이름 — 이 폴더가 있으면 새로 만들지 않고 이름만 바꿔 계속 쓴다 */
const LEGACY_PHOTO_ROOT_FOLDER_NAME = "plan.0";
const PHOTO_FOLDER_NAME = "사진";
const PHOTO_THUMB_FOLDER_NAME = ".thumbs";

async function ensurePhotoRootFolder(drive: drive_v3.Drive): Promise<string> {
  let rootId = await findFolder(drive, PHOTO_ROOT_FOLDER_NAME, "root");
  if (!rootId) {
    const legacyId = await findFolder(drive, LEGACY_PHOTO_ROOT_FOLDER_NAME, "root");
    if (legacyId) {
      await drive.files.update({ fileId: legacyId, requestBody: { name: PHOTO_ROOT_FOLDER_NAME } });
      rootId = legacyId;
    }
  }
  rootId ??= await ensureFolder(drive, PHOTO_ROOT_FOLDER_NAME, "root");
  return ensureFolder(drive, PHOTO_FOLDER_NAME, rootId);
}

/** 할 일 사진 폴더 — PLAN.0/사진/<name> (PHOTOS-PLAN.md). 없으면 만든다. */
export async function ensurePhotoFolder(refreshToken: string, name: string): Promise<string> {
  const drive = getDrive(refreshToken);
  return ensureFolder(drive, name, await ensurePhotoRootFolder(drive));
}

/** 캘린더용 작은 사진을 모아두는 폴더 — PLAN.0/사진/.thumbs. 할 일 폴더를 원본만으로 깔끔하게 두려고 따로 둔다. */
export async function ensurePhotoThumbFolder(refreshToken: string): Promise<string> {
  const drive = getDrive(refreshToken);
  return ensureFolder(drive, PHOTO_THUMB_FOLDER_NAME, await ensurePhotoRootFolder(drive));
}

/** 바이너리 파일 내용(사진 등). */
export async function getFileBytes(refreshToken: string, fileId: string): Promise<Buffer> {
  const drive = getDrive(refreshToken);
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
  return Buffer.from(res.data as ArrayBuffer);
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string | null;
  iconLink: string | null;
  modifiedTime: string | null;
}

function toDriveFile(f: drive_v3.Schema$File): DriveFile {
  return {
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    webViewLink: f.webViewLink ?? null,
    iconLink: f.iconLink ?? null,
    modifiedTime: f.modifiedTime ?? null,
  };
}

export async function listFiles(refreshToken: string, folderId: string): Promise<DriveFile[]> {
  const drive = getDrive(refreshToken);
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, iconLink, modifiedTime)",
    orderBy: "name",
    spaces: "drive",
  });
  return (res.data.files ?? []).map(toDriveFile);
}

export async function uploadFile(
  refreshToken: string,
  folderId: string,
  name: string,
  mimeType: string,
  buffer: Buffer
): Promise<DriveFile> {
  const drive = getDrive(refreshToken);
  const res = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, name, mimeType, webViewLink, iconLink, modifiedTime",
  });
  return toDriveFile(res.data);
}

export async function createMarkdownFile(
  refreshToken: string,
  folderId: string,
  title: string,
  content: string
): Promise<DriveFile> {
  const name = title.endsWith(".md") ? title : `${title}.md`;
  return uploadFile(refreshToken, folderId, name, "text/markdown", Buffer.from(content, "utf-8"));
}

export async function updateFileContent(refreshToken: string, fileId: string, content: string): Promise<void> {
  const drive = getDrive(refreshToken);
  await drive.files.update({
    fileId,
    media: { mimeType: "text/markdown", body: Readable.from(Buffer.from(content, "utf-8")) },
  });
}

export async function renameFile(refreshToken: string, fileId: string, name: string): Promise<void> {
  const drive = getDrive(refreshToken);
  await drive.files.update({ fileId, requestBody: { name } });
}

/** 파일/폴더를 Drive 휴지통으로 옮긴다 — 완전 삭제가 아니라서 30일 안에 Drive에서 복구할 수 있다.
 * 폴더를 휴지통에 넣으면 안의 파일도 같이 들어간다. 이미 없는 파일(404)이면 옮길 것도 없으니 성공으로 본다. */
export async function trashFile(refreshToken: string, fileId: string): Promise<void> {
  const drive = getDrive(refreshToken);
  try {
    await drive.files.update({ fileId, requestBody: { trashed: true } });
  } catch (err) {
    const status = (err as { code?: unknown; status?: unknown }).code ?? (err as { status?: unknown }).status;
    if (status === 404 || status === "404") return;
    throw err;
  }
}

/** Picker로 고른 기존 파일을 이 컨테이너 폴더의 자식으로 추가한다(기존 위치는 그대로 두고 추가만 함) —
 * drive.file 스코프에서 앱이 만들지 않은 파일에 접근하려면 사용자가 Picker로 직접 골라야 하고,
 * 그렇게 고른 파일이라도 이 폴더의 자식이어야 파일 목록(listFiles)에 나타난다. */
export async function addFileToFolder(refreshToken: string, fileId: string, folderId: string): Promise<DriveFile> {
  const drive = getDrive(refreshToken);
  const res = await drive.files.update({
    fileId,
    addParents: folderId,
    fields: "id, name, mimeType, webViewLink, iconLink, modifiedTime",
  });
  return toDriveFile(res.data);
}

export async function getFileContent(refreshToken: string, fileId: string): Promise<string> {
  const drive = getDrive(refreshToken);
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
  return res.data as unknown as string;
}
