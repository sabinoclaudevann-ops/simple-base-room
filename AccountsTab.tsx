import { useCallback, useEffect, useState } from "react";
import { Check, Crown, MessageCircle, RefreshCw, ShieldX, Timer, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AccountStatus } from "@/lib/qjuros/account";
import { PLAN_PRICE_LABEL, SUPPORT_WHATSAPP, TRIAL_DAYS } from "@/lib/qjuros/billing";

interface Row {
  id: string;
  email: string | null;
  status: AccountStatus;
  created_at: string;
  trial_ends_at: string | null;
  subscription_until: string | null;
  plan: string | null;
  support_whatsapp: string | null;
}

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

function addDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

export function AccountsTab({ currentUserId }: { currentUserId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, status, created_at, trial_ends_at, subscription_until, plan, support_whatsapp")
      .order("created_at", { ascending: false });
    if (error) toast.error("Não foi possível carregar as contas");
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  type Patch = {
    status?: AccountStatus;
    trial_ends_at?: string | null;
    subscription_until?: string | null;
    plan?: string;
    support_whatsapp?: string | null;
  };

  const patch = async (id: string, values: Patch, message: string) => {
    const { error } = await supabase.from("profiles").update(values).eq("id", id);
    if (error) {
      toast.error("Não foi possível atualizar a conta");
      return;
    }
    toast.success(message);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
  };

  const approve = (r: Row) =>
    patch(
      r.id,
      {
        status: "approved",
        // inicia o teste grátis no momento da autorização
        trial_ends_at: r.trial_ends_at ?? addDays(TRIAL_DAYS),
        plan: r.plan ?? "trial",
      },
      `Conta autorizada com ${TRIAL_DAYS} dia de teste`,
    );

  const grantMonth = (r: Row) => {
    const base = r.subscription_until && new Date(r.subscription_until).getTime() > Date.now()
      ? new Date(r.subscription_until).getTime()
      : Date.now();
    return patch(
      r.id,
      {
        status: "approved",
        subscription_until: new Date(base + 30 * 86_400_000).toISOString(),
        plan: "mensal",
      },
      "Plano mensal liberado por 30 dias",
    );
  };

  /** Troca o plano da conta: teste reinicia o período grátis; mensal garante 30 dias. */
  const setPlan = (r: Row, plan: string) => {
    if (plan === r.plan) return;
    if (plan === "mensal") {
      void grantMonth(r);
      return;
    }
    void patch(
      r.id,
      {
        status: "approved",
        plan: "trial",
        trial_ends_at: addDays(TRIAL_DAYS),
        subscription_until: null,
      },
      `Conta voltou para o teste grátis (${TRIAL_DAYS} dia)`,
    );
  };

  /** Define manualmente a data limite de acesso (teste ou assinatura, conforme o plano). */
  const setAccessUntil = (r: Row, dateValue: string) => {
    if (!dateValue) return;
    const iso = new Date(`${dateValue}T23:59:59`).toISOString();
    if (r.plan === "mensal") {
      void patch(r.id, { subscription_until: iso }, "Validade do plano atualizada");
    } else {
      void patch(r.id, { trial_ends_at: iso }, "Validade do teste atualizada");
    }
  };

  const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

  const label: Record<AccountStatus, string> = {
    pending: "Aguardando",
    approved: "Autorizada",
    blocked: "Bloqueada",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Contas autorizadas ganham {TRIAL_DAYS} dia de teste. Depois disso só entram com o plano
          mensal ({PLAN_PRICE_LABEL}) liberado por você.
        </p>
        <button className="q-btn q-btn-ghost shrink-0" onClick={() => void load()}>
          <RefreshCw className="size-3.5" /> Atualizar
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma conta encontrada.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {r.email ?? r.id}
                  {r.id === currentUserId && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">(você)</span>
                  )}
                </span>
                <span className="q-tag">{label[r.status]}</span>
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
                <span>
                  <Timer className="mr-1 inline size-3" />
                  Teste até {fmt(r.trial_ends_at)}
                </span>
                <span>
                  <Crown className="mr-1 inline size-3" />
                  Plano {r.plan ?? "—"} até {fmt(r.subscription_until)}
                </span>
              </p>

              <div className="mt-2 flex items-center gap-2">
                <MessageCircle className="size-3.5 text-muted-foreground" />
                <input
                  type="tel"
                  defaultValue={r.support_whatsapp ?? SUPPORT_WHATSAPP}
                  placeholder={SUPPORT_WHATSAPP}
                  className="q-input h-8 max-w-[200px] text-xs"
                  onBlur={(e) => {
                    const value = e.target.value.trim() || null;
                    if (value !== r.support_whatsapp) {
                      void patch(r.id, { support_whatsapp: value }, "Número de WhatsApp atualizado");
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  Plano
                  <select
                    className="q-input h-8 text-xs"
                    value={r.plan ?? "trial"}
                    onChange={(e) => setPlan(r, e.target.value)}
                  >
                    <option value="trial">Teste grátis</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  Acesso até
                  <input
                    type="date"
                    className="q-input h-8 text-xs"
                    value={toDateInput(r.plan === "mensal" ? r.subscription_until : r.trial_ends_at)}
                    onChange={(e) => setAccessUntil(r, e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <button className="q-btn q-btn-primary" onClick={() => void approve(r)}>
                    <Check className="size-3.5" /> Autorizar
                  </button>
                )}
                <button className="q-btn q-btn-ghost is-accent" onClick={() => void grantMonth(r)}>
                  <Crown className="size-3.5" /> Liberar 30 dias
                </button>
                {r.status !== "blocked" && (
                  <button
                    className="q-btn q-btn-ghost is-danger"
                    onClick={() => void patch(r.id, { status: "blocked" }, "Conta bloqueada")}
                  >
                    <ShieldX className="size-3.5" /> Bloquear
                  </button>
                )}
                {r.status !== "pending" && (
                  <button
                    className="q-btn q-btn-ghost"
                    onClick={() => void patch(r.id, { status: "pending" }, "Conta em espera")}
                  >
                    <Undo2 className="size-3.5" /> Deixar em espera
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
