// PLAN.0 서비스 워커 — 웹 푸시 알림 + 앱 아이콘 배지 (WEBAPP-PLAN.md 2단계)
// 오프라인 캐시는 일부러 하지 않는다(옛 화면이 남는 문제를 피하려고). fetch 핸들러 없음.
//
// 서버(6단계 /api/push/dispatch)가 보내는 페이로드:
//   { title: string, body?: string, url?: string, badge?: number, tag?: string }
//   - url: 알림을 눌렀을 때 열 앱 안 경로 (예: "/?week=2026-09-28")
//   - badge: 앱 아이콘 배지 숫자. 0이면 배지를 지운다. 없으면 배지는 그대로.
//   - tag: 같은 tag의 알림은 새 알림이 이전 것을 대체한다 (예: "todo-<id>", "context")

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function applyBadge(count) {
  if (typeof count !== "number") return;
  try {
    if (count > 0 && self.navigator.setAppBadge) await self.navigator.setAppBadge(count);
    else if (self.navigator.clearAppBadge) await self.navigator.clearAppBadge();
  } catch {
    // 배지 미지원 / 권한 없음 — 알림은 그대로 보낸다
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "PLAN.0", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "PLAN.0";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    tag: data.tag,
    data: { url: data.url || "/" },
  };

  // iOS는 푸시마다 반드시 알림을 띄워야 한다(조용한 푸시 불가) — 배지와 알림을 같이 처리
  event.waitUntil(Promise.all([applyBadge(data.badge), self.registration.showNotification(title, options)]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = (event.notification.data && event.notification.data.url) || "/";
  const target = new URL(path, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 이미 열린 앱 창이 있으면 그 창을 그 주로 이동, 없으면 새로 연다
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
      await self.clients.openWindow(target);
    })()
  );
});
