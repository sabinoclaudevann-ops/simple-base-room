const SW_URL = "/sw.js";

function isBlockedContext(): boolean {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  if (new URLSearchParams(window.location.search).has("sw")) {
    return new URLSearchParams(window.location.search).get("sw") === "off";
  }
  return false;
}

async function unregisterAppWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL || r.installing?.scriptURL || "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

/** Registra o service worker apenas no app publicado (nunca no preview/dev). */
export function setupServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  if (isBlockedContext()) {
    void unregisterAppWorkers().catch(() => undefined);
    return;
  }

  const UPDATE_INTERVAL_MS = 15 * 60 * 1000; // checagem leve a cada 15 min

  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_URL, {
        updateViaCache: "none",
      });

      const activateUpdate = () => registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        worker?.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) activateUpdate();
        });
      });

      await registration.update();
      activateUpdate();

      // Verifica atualizacao só quando faz sentido (app visível e com internet),
      // para não gastar bateria/dados em segundo plano.
      let lastCheck = Date.now();
      const checkForUpdate = () => {
        if (document.visibilityState !== "visible") return;
        if (typeof navigator !== "undefined" && !navigator.onLine) return;
        if (Date.now() - lastCheck < 60 * 1000) return;
        lastCheck = Date.now();
        void registration.update().catch(() => undefined);
      };

      window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      document.addEventListener("visibilitychange", checkForUpdate);
      window.addEventListener("online", checkForUpdate);
      window.addEventListener("focus", checkForUpdate);
    } catch {
      /* sem internet: mantém a versão já instalada */
    }
  };

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  if (document.readyState === "complete") void register();
  else window.addEventListener("load", () => void register(), { once: true });
}

/** Pre-aquece o cache das rotas principais para funcionar offline no primeiro acesso. */
export async function warmOfflineCache() {
  if (typeof caches === "undefined") return;
  try {
    const cache = await caches.open("qjuros-pages");
    await Promise.allSettled(
      ["/", "/reset-password"].map(async (path) => {
        const res = await fetch(path, { credentials: "same-origin" });
        if (res.ok) await cache.put(path, res.clone());
      }),
    );
  } catch {
    /* offline: ignora */
  }
}
