import { Check, Crown, RefreshCw, X } from "lucide-react";
import type { AccountInfo } from "@/lib/qjuros/account";
import { CloudReportCard } from "@/components/qjuros/CloudReportCard";
import {
  PLAN_PERIOD_LABEL,
  PLAN_PRICE_LABEL,
  TRIAL_DAYS,
  daysLeft,
  hoursLeft,
} from "@/lib/qjuros/billing";

const ITEMS = [
  "Contratos, parcelas e caixa ilimitados",
  "Sincroniza entre aparelhos",
  "PDF do contrato e avisos de vencimento",
];

const RENEWAL_LINK = "https://admin.dominipay.com.br/s/qmaisgestao/892319a7-a408-4a72-81e2-c2d002e0f720";

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

interface Props {
  account: AccountInfo;
  email?: string | undefined;
  onClose: () => void;
}

export function PlanDialog({ account, onClose }: Props) {
  const statusLabel = account.isAdmin
    ? "Administrador — acesso livre"
    : account.inTrial
      ? `Teste grátis — resta ${hoursLeft(account.accessUntil)}h`
      : account.subscriptionUntil
        ? `Plano ${account.plan ?? "mensal"} — válido até ${fmt(account.subscriptionUntil)}`
        : "Acesso ativo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Crown className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold tracking-tight">Meu plano</h2>
            <p className="truncate text-xs text-muted-foreground">{statusLabel}</p>
          </div>
          <button className="q-btn q-btn-ghost shrink-0" onClick={onClose} aria-label="Fechar">
            <X className="size-4" />
          </button>
        </div>

        {account.isAdmin ? (
          <CloudReportCard />
        ) : (
        <div className="rounded-2xl border border-primary bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Plano mensal
          </p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {PLAN_PRICE_LABEL}
            <span className="text-sm font-medium text-muted-foreground"> {PLAN_PERIOD_LABEL}</span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <a
            href={RENEWAL_LINK}
            target="_blank"
            rel="noreferrer"
            className="q-btn q-btn-primary mt-4 w-full justify-center"
          >
            {account.inTrial ? "Migrar para o plano mensal" : "Renovar / mudar plano"}
          </a>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Pagamento seguro pelo Dominipay. A liberação é feita na hora após a confirmação.
            {!account.inTrial && account.accessUntil && (
              <>
                <br />
                Dias pagos são somados: renovar agora mantém os {daysLeft(account.accessUntil)} dia(s)
                restantes.
              </>
            )}
          </p>
        </div>
        )}

        {!account.isAdmin && (
          <button
            className="q-btn q-btn-ghost mt-3 w-full justify-center"
            onClick={() => void account.refresh()}
          >
            <RefreshCw className="size-3.5" /> Já paguei — atualizar status
          </button>
        )}
      </div>
    </div>
  );
}
