import { useCallback, useEffect, useState } from "react";
import { Database, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TableStat {
  table: string;
  rows: number;
  size: string;
}

interface CloudStats {
  db_size_pretty: string;
  db_size_bytes: number;
  usage_percent: number;
  limit_pretty: string;
  tables: TableStat[];
  users_total: number;
}

/** Relatório de uso do banco (Lovable Cloud) — visível só para a conta principal. */
export function CloudReportCard() {
  const [stats, setStats] = useState<CloudStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("cloud_stats" as never);
    if (error) {
      setDenied(true);
    } else {
      setStats(data as unknown as CloudStats);
      setDenied(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (denied) return null;

  const usage = Math.min(100, Math.max(0, stats?.usage_percent ?? 0));

  return (
    <section className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Database className="size-4 text-primary" /> Uso do Cloud (banco de dados)
        </h3>
        <button
          className="q-btn q-btn-ghost shrink-0"
          onClick={() => void load()}
          aria-label="Atualizar relatório do Cloud"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      {loading ? (
        <p className="mt-2 text-xs text-muted-foreground">Carregando…</p>
      ) : stats ? (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="text-lg font-bold leading-tight">{stats.db_size_pretty}</p>
              <p className="text-[11px] text-muted-foreground">Tamanho do banco</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-2.5 text-center">
              <p className="flex items-center justify-center gap-1 text-lg font-bold leading-tight">
                <Users className="size-4" /> {stats.users_total}
              </p>
              <p className="text-[11px] text-muted-foreground">Usuários registrados</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl bg-muted/50 p-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Uso do banco</span>
              <span className="font-semibold text-foreground">
                {usage.toFixed(2).replace(".", ",")}% de {stats.limit_pretty}
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${usage}%` }}
                aria-label={`Uso do banco: ${usage}%`}
              />
            </div>
          </div>

          {stats.tables.length > 0 && (
            <ul className="mt-3 space-y-1">
              {stats.tables.map((t) => (
                <li
                  key={t.table}
                  className="flex items-center justify-between text-[11px] text-muted-foreground"
                >
                  <span className="font-mono">{t.table}</span>
                  <span>
                    {t.rows.toLocaleString("pt-BR")} reg. · {t.size}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 text-[10px] leading-snug text-muted-foreground">
            O gasto em créditos do Cloud aparece em Settings → Plans & credits. Aqui você acompanha
            o tamanho dos dados, que é o que mais influencia o consumo.
          </p>
        </>
      ) : null}
    </section>
  );
}
