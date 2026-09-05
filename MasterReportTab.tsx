import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, isOverdue } from "@/lib/qjuros/logic";
import { getDefaultData, type AppData } from "@/lib/qjuros/types";

interface UserBlock {
  userId: string;
  email: string;
  updatedAt: string;
  data: AppData;
}

interface LoanRow {
  email: string;
  client: string;
  capital: number;
  rate: number;
  type: string;
  startDate: string;
  paid: number;
  pendingInterest: number;
  overdue: number;
  active: boolean;
}

export function MasterReportTab() {
  const [blocks, setBlocks] = useState<UserBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: states, error }, { data: profiles }] = await Promise.all([
      supabase.from("app_state").select("user_id, data, updated_at"),
      supabase.from("profiles").select("id, email"),
    ]);
    if (error) {
      toast.error("Não foi possível carregar o relatório geral");
      setLoading(false);
      return;
    }
    const emails = new Map((profiles ?? []).map((p) => [p.id, p.email ?? "—"]));
    setBlocks(
      (states ?? []).map((row) => ({
        userId: row.user_id as string,
        email: emails.get(row.user_id as string) ?? "—",
        updatedAt: row.updated_at as string,
        data: { ...getDefaultData(), ...((row.data ?? {}) as Partial<AppData>) } as AppData,
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<LoanRow[]>(() => {
    const out: LoanRow[] = [];
    for (const block of blocks) {
      const clients = new Map((block.data.clients ?? []).map((c) => [c.id, c.name]));
      for (const contract of block.data.contracts ?? []) {
        if (contract.deleted) continue;
        const parcels = (block.data.installments ?? []).filter(
          (i) => i.contractId === contract.id && !i.deleted,
        );
        const pendingInterest = parcels
          .filter((i) => !i.paid)
          .reduce((sum, i) => sum + (i.interest ?? 0), 0);
        out.push({
          email: block.email,
          client: clients.get(contract.clientId) ?? "Cliente removido",
          capital: contract.capital ?? 0,
          rate: contract.rate ?? 0,
          type: contract.type === "installments" ? "Parcelado" : "Somente juros",
          startDate: contract.startDate,
          paid: contract.totalPaid ?? 0,
          pendingInterest,
          overdue: parcels.filter((i) => isOverdue(i)).length,
          active: contract.active,
        });
      }
    }
    return out.sort((a, b) => (a.email === b.email ? b.capital - a.capital : a.email.localeCompare(b.email)));
  }, [blocks]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(term) || r.client.toLowerCase().includes(term));
  }, [rows, query]);

  const totals = useMemo(
    () => ({
      users: blocks.length,
      contracts: filtered.length,
      capital: filtered.reduce((s, r) => s + r.capital, 0),
      received: filtered.reduce((s, r) => s + r.paid, 0),
      pending: filtered.reduce((s, r) => s + r.pendingInterest, 0),
      overdue: filtered.reduce((s, r) => s + r.overdue, 0),
    }),
    [blocks, filtered],
  );

  const exportCsv = () => {
    const header = ["Usuário", "Cliente", "Capital", "Taxa %", "Modalidade", "Início", "Recebido", "Juros a receber", "Parcelas vencidas", "Status"];
    const lines = filtered.map((r) =>
      [r.email, r.client, r.capital.toFixed(2), r.rate, r.type, r.startDate, r.paid.toFixed(2), r.pendingInterest.toFixed(2), r.overdue, r.active ? "Ativo" : "Quitado"]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(";"),
    );
    const blob = new Blob(["\uFEFF" + [header.join(";"), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qgestao-relatorio-geral.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando relatório geral…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
        <ShieldAlert className="size-3.5 shrink-0 text-primary" />
        <span>Área secreta do administrador — dados de todas as contas.</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric label="Usuários" value={String(totals.users)} />
        <Metric label="Contratos" value={String(totals.contracts)} />
        <Metric label="Capital emprestado" value={formatCurrency(totals.capital)} />
        <Metric label="Total recebido" value={formatCurrency(totals.received)} />
        <Metric label="Juros a receber" value={formatCurrency(totals.pending)} />
        <Metric label="Parcelas vencidas" value={String(totals.overdue)} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            className="q-input pl-8"
            placeholder="Buscar por e-mail ou cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button className="q-btn q-btn-ghost shrink-0" onClick={() => void load()}>
          <RefreshCw className="size-3.5" /> Atualizar
        </button>
        <button className="q-btn q-btn-primary shrink-0" onClick={exportCsv}>
          Exportar CSV
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum contrato encontrado.</p>
        )}
        {filtered.map((r, index) => (
          <div key={index} className="rounded-2xl border border-border p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="truncate">{r.client}</strong>
              <span className="q-tag">{r.type}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">{r.email}</p>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <span>Capital: <strong>{formatCurrency(r.capital)}</strong></span>
              <span>Taxa: <strong>{r.rate}%</strong></span>
              <span>Recebido: <strong>{formatCurrency(r.paid)}</strong></span>
              <span>Juros a receber: <strong>{formatCurrency(r.pendingInterest)}</strong></span>
              <span>Início: {formatDate(r.startDate)}</span>
              <span className={r.overdue > 0 ? "text-destructive" : ""}>
                Vencidas: {r.overdue}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-base font-bold">{value}</p>
    </div>
  );
}
