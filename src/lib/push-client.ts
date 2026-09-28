"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * 브라우저 쪽 웹 푸시 도우미 (WEBAPP-PLAN.md 4단계). 권한 요청 · 구독 · `push_subscriptions` 저장 · 해제.
 * 아이폰은 **홈 화면에 추가한 웹앱**에서만 푸시가 된다(Safari 탭 불가) — `pushEnvironment()`로 먼저 확인한다.
 */

export type PushEnvironment =
  /** 푸시 가능 */
  | "ready"
  /** 아이폰/아이패드 Safari 탭 — 홈 화면에 추가해야 함 */
  | "ios-needs-install"
  /** 이 브라우저는 웹 푸시 미지원 */
  | "unsupported"
  /** 서버 설정(VAPID 공개키)이 아직 없음 — WEBAPP-PLAN.md 6단계 */
  | "not-configured";

export type PushState = "on" | "off" | "denied";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function isIos() {
  const ua = navigator.userAgent;
  // iPadOS는 데스크톱 UA를 쓰므로 터치 여부로 구분
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function pushEnvironment(): PushEnvironment {
  if (typeof window === "undefined") return "unsupported";
  if (isIos() && !isStandalone()) return "ios-needs-install";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  if (!VAPID_PUBLIC_KEY) return "not-configured";
  return "ready";
}

/** 이 기기의 현재 상태 — 권한 거부 / 구독 있음 / 없음 */
export async function currentPushState(): Promise<PushState> {
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * 알림 켜기 — **반드시 버튼 클릭 핸들러 안에서** 부른다(아이폰은 사용자 동작 없이 권한을 못 물어봄).
 * 구독을 `push_subscriptions`에 저장(같은 기기 endpoint면 갱신).
 */
export async function enablePush(userId: string): Promise<PushState> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = subscription.toJSON();
  const supabase = createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
  return "on";
}

/** 이 기기만 알림 끄기 — 구독 해제 + DB에서 삭제 */
export async function disablePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await createClient().from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
    await subscription.unsubscribe();
  }
  return "off";
}

/** 테스트 알림 — 서버 발송(6단계) 전이라 이 기기에서 서비스 워커로 바로 띄운다. 배지도 같이 확인. */
export async function showTestNotification() {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification("plan.0 테스트 알림", {
    body: "이 기기에서 알림을 받을 수 있어요",
    icon: "/icons/icon-192.png",
    tag: "test",
    data: { url: "/" },
  });
}
