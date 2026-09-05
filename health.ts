import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Monitor de disponibilidade do backend.
 * Faz um ping leve no endpoint público de keep-alive. Só considera
 * "indisponibilidade persistente" quando o dispositivo está online e
 * houve várias falhas seguidas — evitando alarme falso por queda de rede.
 */

const PING_PATH = "/api/public/keep-alive";
const CHECK_INTERVAL_MS = 2 * 60 * 1000; // 2 min
const RECOVERY_INTERVAL_MS = 10 * 1000; // enquanto estiver fora, testa a cada 10 s
const FAILURES_TO_ALERT = 3; // ~6 min de falha contínua
const ALERT_COOLDOWN_MS = 60 * 60 * 1000; // 1 alerta por hora
const LAST_ALERT_KEY = "qjuros:lastBackendAlert";

export type BackendStatus = "checking" | "online" | "offline" | "down";

export type BackendHealth = {
  status: BackendStatus;
  failures: number;
  lastOkAt: number | null;
  checkNow: () => Promise<boolean>;
};

async function ping(): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${PING_PATH}?t=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean };
    return body.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function notifyDown(minutes: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const last = Number(localStorage.getItem(LAST_ALERT_KEY) ?? 0);
  if (Date.now() - last < ALERT_COOLDOWN_MS) return;
  localStorage.setItem(LAST_ALERT_KEY, String(Date.now()));

  new Notification("Q+Gestão · servidor indisponível", {
    body: `O servidor não responde há cerca de ${minutes} min. Seus dados seguem salvos no aparelho, mas a sincronização está parada.`,
    icon: "/app-icon-192.png",
    badge: "/app-icon-192.png",
    tag: "qjuros-backend-down",
  });
}

export function useBackendHealth(enabled: boolean): BackendHealth {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [failures, setFailures] = useState(0);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const running = useRef(false);

  const checkNow = useCallback(async (): Promise<boolean> => {
    if (running.current) return false;
    running.current = true;
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        setStatus("offline");
        return false;
      }
      const ok = await ping();
      if (ok) {
        setFailures(0);
        setLastOkAt(Date.now());
        setStatus("online");
        localStorage.removeItem(LAST_ALERT_KEY);
        return true;
      }
      setFailures((prev) => {
        const next = prev + 1;
        if (next >= FAILURES_TO_ALERT) {
          setStatus("down");
          notifyDown(Math.round((next * CHECK_INTERVAL_MS) / 60000));
        }
        return next;
      });
      return false;
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void checkNow();
    const interval = setInterval(() => void checkNow(), CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkNow();
    };
    const onOnline = () => void checkNow();
    const onOffline = () => setStatus("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [enabled, checkNow]);

  useEffect(() => {
    if (!enabled || status !== "down") return;

    // Não depende de outro clique: assim que o servidor responder novamente,
    // checkNow muda o estado para online e o aviso desaparece.
    const recoveryInterval = setInterval(() => void checkNow(), RECOVERY_INTERVAL_MS);
    return () => clearInterval(recoveryInterval);
  }, [enabled, status, checkNow]);

  return { status, failures, lastOkAt, checkNow };
}
