import { useCallback, useEffect, useState } from "react";
import type { AppData } from "./types";
import { formatCurrency, getClientName, todayISO } from "./logic";

const LAST_KEY = "qjuros:lastNotified";
/** Horário diário do aviso (hora local). */
const NOTIFY_HOUR = 7;

function msUntilNextNotifyHour() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(NOTIFY_HOUR, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export type NotifStatus = "unsupported" | "default" | "granted" | "denied";

function currentStatus(): NotifStatus {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifStatus;
}

function buildMessage(data: AppData) {
  const today = todayISO();
  const pending = data.installments.filter((i) => !i.paid && !i.deleted);
  const dueToday = pending.filter((i) => i.dueDate === today);
  const overdue = pending.filter((i) => i.dueDate < today);
  if (dueToday.length === 0 && overdue.length === 0) return null;

  const nameOf = (contractId: number) => {
    const contract =
      data.contracts.find((c) => c.id === contractId) ??
      data.trash.contracts.find((c) => c.id === contractId);
    return contract ? getClientName(data, contract.clientId) : "Cliente";
  };

  const parts: string[] = [];
  if (dueToday.length) {
    const total = dueToday.reduce((s, i) => s + i.total, 0);
    parts.push(
      `Vence hoje: ${dueToday.length} parcela(s) · ${formatCurrency(total)} (${dueToday
        .slice(0, 3)
        .map((i) => nameOf(i.contractId))
        .join(", ")}${dueToday.length > 3 ? "…" : ""})`,
    );
  }
  if (overdue.length) {
    const total = overdue.reduce((s, i) => s + i.total, 0);
    parts.push(`Atrasadas: ${overdue.length} parcela(s) · ${formatCurrency(total)}`);
  }
  return { title: "Q+Gestão · parcelas a receber", body: parts.join("\n") };
}

export function useDueNotifications(data: AppData, enabled: boolean) {
  const [status, setStatus] = useState<NotifStatus>("default");

  useEffect(() => setStatus(currentStatus()), []);

  const request = useCallback(async () => {
    if (currentStatus() === "unsupported") return "unsupported" as const;
    const result = (await Notification.requestPermission()) as NotifStatus;
    setStatus(result);
    return result;
  }, []);

  const notifyNow = useCallback(
    (force = false) => {
      if (currentStatus() !== "granted") return false;
      const message = buildMessage(data);
      if (!message) return false;
      const today = todayISO();
      if (!force) {
        // só dispara a partir das 7h da manhã, uma vez por dia
        if (new Date().getHours() < NOTIFY_HOUR) return false;
        if (localStorage.getItem(LAST_KEY) === today) return false;
      }
      localStorage.setItem(LAST_KEY, today);
      new Notification(message.title, {
        body: message.body,
        icon: "/app-icon-192.png",
        badge: "/app-icon-192.png",
        tag: "qjuros-vencimentos",
      });
      return true;
    },
    [data],
  );

  useEffect(() => {
    if (!enabled || status !== "granted") return;
    const check = () => notifyNow();
    const timeout = setTimeout(check, 1500);
    // dispara exatamente às 7h se o app estiver aberto
    const dailyTimeout = setTimeout(() => {
      check();
    }, msUntilNextNotifyHour());
    // e confere periodicamente (cobre app reaberto depois das 7h)
    const interval = setInterval(check, 15 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timeout);
      clearTimeout(dailyTimeout);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, status, notifyNow]);

  return { status, request, notifyNow, hasAlerts: buildMessage(data) !== null };
}
