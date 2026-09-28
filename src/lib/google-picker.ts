"use client";

// 브라우저 전용. drive.file 스코프는 앱이 만들지 않은 파일에 접근하려면 사용자가 Google Picker로
// 직접 골라야 한다(PLANNING.md 9.9 참고) — 그렇게 고른 파일은 자동으로 이 앱에 대한 접근 권한이
// 생긴다. Picker는 npm 패키지가 없어서 구글이 제공하는 로더 스크립트를 직접 불러와 쓴다.

interface PickerDocsView {
  setParent: (folderId: string) => PickerDocsView;
  setIncludeFolders: (include: boolean) => PickerDocsView;
  setSelectFolderEnabled: (enabled: boolean) => PickerDocsView;
}

interface PickerBuilder {
  setOAuthToken: (token: string) => PickerBuilder;
  setDeveloperKey: (key: string) => PickerBuilder;
  addView: (view: PickerDocsView) => PickerBuilder;
  enableFeature: (feature: unknown) => PickerBuilder;
  setCallback: (cb: (data: PickerResponse) => void) => PickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

declare global {
  interface Window {
    gapi?: {
      load: (name: string, options: { callback: () => void; onerror?: () => void }) => void;
    };
    google?: {
      picker: {
        DocsView: new (viewId: unknown) => PickerDocsView;
        ViewId: { DOCS: unknown };
        Feature: { MULTISELECT_ENABLED: unknown };
        Action: { PICKED: string; CANCEL: string };
        PickerBuilder: new () => PickerBuilder;
      };
    };
  }
}

interface PickerResponse {
  action: string;
  docs?: { id: string; name: string }[];
}

export interface PickedFile {
  id: string;
  name: string;
}

let pickerReady: Promise<void> | null = null;

function loadGapiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("브라우저에서만 사용할 수 있습니다."));
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google API 스크립트를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });
}

function loadPicker(): Promise<void> {
  if (!pickerReady) {
    pickerReady = loadGapiScript().then(
      () =>
        new Promise<void>((resolve, reject) => {
          window.gapi!.load("picker", { callback: resolve, onerror: () => reject(new Error("Picker를 불러오지 못했습니다.")) });
        })
    );
  }
  return pickerReady;
}

/** 지정한 Drive 폴더를 시작 위치로 Picker를 띄우고, 사용자가 고른 파일 목록을 돌려준다
 * (취소하면 빈 배열). 고르는 즉시 drive.file 스코프로 그 파일들에 대한 접근 권한이 생긴다. */
export async function pickDriveFiles(accessToken: string, apiKey: string, folderId: string): Promise<PickedFile[]> {
  await loadPicker();
  const picker = window.google!.picker;

  return new Promise((resolve, reject) => {
    const view = new picker.DocsView(picker.ViewId.DOCS)
      .setParent(folderId)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);

    const builder = new picker.PickerBuilder()
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .addView(view)
      .enableFeature(picker.Feature.MULTISELECT_ENABLED)
      .setCallback((data: PickerResponse) => {
        if (data.action === picker.Action.PICKED) {
          resolve((data.docs ?? []).map((doc) => ({ id: doc.id, name: doc.name })));
        } else if (data.action === picker.Action.CANCEL) {
          resolve([]);
        }
      });

    try {
      builder.build().setVisible(true);
    } catch (err) {
      reject(err instanceof Error ? err : new Error("Picker를 여는 데 실패했습니다."));
    }
  });
}
