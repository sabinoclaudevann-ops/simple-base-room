import { AlertTriangle } from "lucide-react";
import type { AppData } from "@/lib/qjuros/types";
import {
  daysOverdue,
  formatCurrency,
  formatDate,
  getClientName,
  getOverdueInstallments,
} from "@/lib/qjuros/logic";

export function OverdueTab({ data }: { data: AppData }) {
  const overdue = getOverdueInstallments(data).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const total = overdue.reduce((s, i) => s + i.total, 0);
  const clientsCount = new Set(
    overdue
      .map((i) => data.contracts.find((c) => c.id === i.contractId)?.clientId)
      .filter((id): id is number => id !== undefined),
  ).size;
  const maxDays = overdue.reduce((m, i) => Math.max(m, daysOverdue(i)), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="q-stat">
          <p className="text-xs font-semibold text-muted-foreground">Total vencido</p>
          <p className="q-stat-value text-destructive">{formatCurrency(total)}</p>
          <p className="text-xs text-muted-foreground">{overdue.length} parcelas</p>
        </div>
        <div className="q-stat">
          <p className="text-xs font-semibold text-muted-foreground">Clientes em atraso</p>
          <p className="q-stat-value">{clientsCount}</p>
        </div>
        <div className="q-stat">
          <p className="text-xs font-semibold text-muted-foreground">Maior atraso</p>
          <p className="q-stat-value">{maxDays} dias</p>
        </div>
      </div>

      {overdue.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma parcela vencida
        </p>
      ) : (
        <ul className="space-y-2">
          {overdue.map((i) => {
            const contract = data.contracts.find((c) => c.id === i.contractId);
            return (
              <li
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary px-4 py-3"
              >
                <div className="text-sm">
                  <p className="font-semibold">
                    {contract ? getClientName(data, contract.clientId) : "Cliente removido"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Parcela {i.number} · {formatCurrency(i.total)} · venceu {formatDate(i.dueDate)}
                  </p>
                </div>
                <span className="q-tag is-overdue">
                  <AlertTriangle className="size-3" /> {daysOverdue(i)} dias
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
