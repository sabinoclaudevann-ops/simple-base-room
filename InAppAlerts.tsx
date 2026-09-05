import { AlertTriangle, CalendarCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppData } from "@/lib/qjuros/types";
import { formatCurrency, getClientName, todayISO } from "@/lib/qjuros/logic";

interface Props {
  data: AppData;
  onViewInstallments?: () => void;
}

const DISMISSED_KEY = "qjuros:dismissedAlerts";

function readDismissed(): string {
  try {
    return localStorage.getItem(DISMISSED_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeDismissed(value: string) {
  try {
    localStorage.setItem(DISMISSED_KEY, value);
  } catch {
    /* ignore */
  }
}

export function useAlertSummary(data: AppData) {
  const today = todayISO();
  const pending = data.installments.filter((i) => !i.paid && !i.deleted);
  const dueToday = pending.filter((i) => i.dueDate === today);
  const overdue = pending.filter((i) => i.dueDate < today);

  const totalDueToday = dueToday.reduce((s, i) => s + i.total, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.total, 0);

  const nameOf = (contractId: number) => {
    const contract =
      data.contracts.find((c) => c.id === contractId) ??
      data.trash.contracts.find((c) => c.id === contractId);
    return contract ? getClientName(data, contract.clientId) : "Cliente";
  };

  const preview = (items: typeof dueToday, max = 3) =>
    items
      .slice(0, max)
      .map((i) => nameOf(i.contractId))
      .join(", ") + (items.length > max ? "…" : "");

  return {
    today,
    dueToday,
    overdue,
    totalDueToday,
    totalOverdue,
    dueTodayPreview: preview(dueToday),
    overduePreview: preview(overdue),
    count: dueToday.length + overdue.length,
  };
}

export function InAppAlerts({ data, onViewInstallments }: Props) {
  const summary = useAlertSummary(data);
  const [dismissedKey, setDismissedKey] = useState(readDismissed());

  useEffect(() => {
    setDismissedKey(readDismissed());
  }, [summary.today]);

  if (summary.count === 0) return null;

  const currentKey = `${summary.today}|${summary.count}|${summary.totalOverdue}|${summary.totalDueToday}`;
  if (dismissedKey === currentKey) return null;

  const dismiss = () => {
    writeDismissed(currentKey);
    setDismissedKey(currentKey);
  };

  return (
    <div className="space-y-2">
      {summary.overdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-destructive">
              {summary.overdue.length} parcela{summary.overdue.length > 1 ? "s" : ""} vencida
              {summary.overdue.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-destructive/90">
              Total {formatCurrency(summary.totalOverdue)} · {summary.overduePreview}
            </p>
          </div>
          <button
            onClick={onViewInstallments}
            className="shrink-0 rounded-full bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground"
          >
            Ver
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-destructive hover:bg-destructive/20"
            aria-label="Dispensar"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {summary.dueToday.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <CalendarCheck className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-warning">
              {summary.dueToday.length} parcela{summary.dueToday.length > 1 ? "s" : ""} vence
              {summary.dueToday.length > 1 ? "m" : ""} hoje
            </p>
            <p className="text-xs text-warning/90">
              Total {formatCurrency(summary.totalDueToday)} · {summary.dueTodayPreview}
            </p>
          </div>
          <button
            onClick={onViewInstallments}
            className="shrink-0 rounded-full bg-warning px-3 py-1.5 text-xs font-semibold text-warning-foreground"
          >
            Ver
          </button>
          <button
            onClick={dismiss}
            className="shrink-0 rounded-full p-1 text-warning hover:bg-warning/20"
            aria-label="Dispensar"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
