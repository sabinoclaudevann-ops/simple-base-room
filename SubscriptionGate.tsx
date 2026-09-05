import { Check, Crown, LogOut, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  PLAN_PERIOD_LABEL,
  PLAN_PRICE_LABEL,
  TRIAL_DAYS,
} from "@/lib/qjuros/billing";

interface Props {
  email?: string | undefined;
  supportWhatsApp?: string;
  onRefresh: () => void;
}

const ITEMS = [
  "Contratos, parcelas e caixa ilimitados",
  "Sincroniza entre aparelhos",
  "PDF do contrato e avisos de vencimento",
];

const RENEWAL_LINK = "https://admin.dominipay.com.br/s/qmaisgestao/892319a7-a408-4a72-81e2-c2d002e0f720";

export function SubscriptionGate({ onRefresh }: Props) {

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <section className="q-card space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          <Crown className="size-7" />
        </div>
        <h1 className="text-lg font-bold tracking-tight">Seu teste grátis terminou</h1>
        <p className="text-sm text-muted-foreground">
          Você usou os {TRIAL_DAYS} dia de teste. Para continuar usando o Q+Gestão, ative o
          plano mensal. Seus dados continuam salvos.
        </p>

        <div className="rounded-2xl border border-primary bg-primary/5 p-5">
          <p className="text-3xl font-bold tracking-tight">
            {PLAN_PRICE_LABEL}
            <span className="text-sm font-medium text-muted-foreground">
              {" "}
              {PLAN_PERIOD_LABEL}
            </span>
          </p>
          <ul className="mt-4 space-y-2 text-left">
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
            className="q-btn q-btn-primary mt-5 w-full justify-center"
          >
            Assinar agora
          </a>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Pagamento seguro pelo Dominipay. A liberação é feita na hora após a confirmação.
          </p>
        </div>

        
        <div className="flex gap-2">
          <button className="q-btn q-btn-ghost flex-1 justify-center" onClick={onRefresh}>
            <RefreshCw className="size-3.5" /> Já paguei
          </button>
          <button
            className="q-btn q-btn-ghost flex-1 justify-center"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </section>
    </main>
  );
}
