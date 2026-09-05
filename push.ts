import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
} from "./push.functions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function keyToBase64(key: ArrayBuffer | null) {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export type PushResult =
  | "ok"
  | "unsupported"
  | "no-service-worker"
  | "denied"
  | "not-configured"
  | "error";

/** Ativa o push do servidor (funciona com o app fechado). */
export async function enableServerPush(): Promise<PushResult> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied";
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return "no-service-worker";

    const { publicKey } = await getVapidPublicKey();
    if (!publicKey) return "not-configured";

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await savePushSubscription({
      data: {
        endpoint: subscription.endpoint,
        p256dh: keyToBase64(subscription.getKey("p256dh")),
        auth: keyToBase64(subscription.getKey("auth")),
      },
    });
    return "ok";
  } catch (error) {
    console.error("[push] falha ao ativar", error);
    return "error";
  }
}

export async function disableServerPush() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscription({ data: { endpoint: subscription.endpoint } }).catch(
    () => undefined,
  );
  await subscription.unsubscribe().catch(() => undefined);
}
