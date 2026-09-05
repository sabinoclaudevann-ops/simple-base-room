import {
  BadgeCheck,
  CalendarDays,
  Clock,
  HandCoins,
  Percent,
  PieChart,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import type { AppData } from "@/lib/qjuros/types";
import {
  formatCurrency,
  getOverdueInstallments,
  getPendingInstallments,
  getCashBalance,
  getPendingInterest,
  getInterestByMonth,
  getOutstandingCapital,
  getWeightedAverageRate,
} from "@/lib/qjuros/logic";


export type DashboardDestination =
  | "capital"
  | "toReceive"
  | "overdue"
  | "cash"
  | "avgRate";

const stats: {
  key: DashboardDestination;
  icon: typeof HandCoins;
  tone: string;
  target: string;
}[] = [
  { key: "capital", icon: HandCoins, tone: "text-accent", target: "Contratos" },
  { key: "toReceive", icon: Clock, tone: "text-warning", target: "Juros a receber no mês" },
  { key: "overdue", icon: TriangleAlert, tone: "text-destructive", target: "Parcelas vencidas" },
  { key: "cash", icon: Wallet, tone: "text-primary", target: "Caixa" },
  { key: "avgRate", icon: Percent, tone: "text-success", target: "Média de juros" },
];

interface Props {
  data: AppData;
  onNavigate?: (dest: DashboardDestination) => void;
}

export function Dashboard({ data, onNavigate }: Props) {
  const activeContracts = data.contracts.filter((c) => !c.deleted);
  const pending = getPendingInstallments(data);
  const overdue = getOverdueInstallments(data);

  const totalLoaned = activeContracts.reduce((s, c) => s + c.capital, 0);

  const values = {
    capital: {
      label: "Capital emprestado",
      value: formatCurrency(getOutstandingCapital(data)),
      sub: `de ${formatCurrency(totalLoaned)} · ${activeContracts.length} contrato(s)`,
    },
    toReceive: {
      label: "Juro a receber no mês",
      value: formatCurrency(getPendingInterest(data)),
      sub: `${pending.length} parcela(s) em aberto`,
    },
    overdue: {
      label: "Vencido",
      value: formatCurrency(overdue.reduce((s, i) => s + i.total, 0)),
      sub: `${overdue.length} parcela(s) em atraso`,
    },
    cash: {
      label: "Caixa",
      value: formatCurrency(getCashBalance(data)),
      sub: "Saldo disponível",
    },
    avgRate: {
      label: "Média de juros",
      value: `${getWeightedAverageRate(data).toFixed(2).replace(".", ",")}% a.m.`,
      sub: "Ponderado pelo capital emprestado",
    },
  };

  const today = new Date().toLocaleDateString("pt-BR");
  const interestByMonth = getInterestByMonth(data).slice(0, 6);
  const maxInterest = Math.max(...interestByMonth.map((m) => m.total), 1);

  return (
    <section data-dashboard className="q-card p-4 sm:p-6">
      <header className="mb-2 flex items-center justify-between gap-2 sm:mb-4">
        <h2 className="flex min-w-0 items-center gap-1.5 text-base font-bold tracking-tight sm:gap-2 sm:text-lg">
          <PieChart className="size-4 shrink-0 text-primary sm:size-5" />{" "}
          <span className="truncate">Dashboard</span>
        </h2>
        <span className="q-tag shrink-0 text-[10px] sm:text-xs">
          <CalendarDays className="size-3" /> {today}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        {stats.map(({ key, icon: Icon, tone, target }) => {
          const clickable = !!onNavigate;
          const Wrapper = clickable ? "button" : "div";
          return (
            <Wrapper
              key={key}
              type={clickable ? "button" : undefined}
              onClick={clickable ? () => onNavigate(key) : undefined}
              title={clickable ? `Ver ${target}` : undefined}
              className={`q-stat flex flex-col justify-between p-2.5 text-left sm:p-4 ${
                clickable
                  ? "cursor-pointer transition-colors hover:border-primary/50 hover:bg-accent-soft/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  : ""
              }`}
            >
              <div className="flex min-w-0 items-center gap-1 text-[10px] font-semibold text-muted-foreground sm:gap-2 sm:text-xs">
                <Icon className={`size-3.5 shrink-0 ${tone} sm:size-4`} />{" "}
                <span className="truncate leading-tight">{values[key].label}</span>
              </div>
              <div
                className={`mt-1 text-sm font-bold leading-tight tracking-tight sm:text-2xl sm:font-bold ${tone}`}
              >
                {values[key].value}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">
                {values[key].sub}
              </div>
            </Wrapper>
          );
        })}
      </div>
      {interestByMonth.length > 0 && (
        <div className="mt-4 border-t border-border pt-3 sm:mt-6 sm:pt-4">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
            <BadgeCheck className="size-3.5 text-primary sm:size-4" /> Juros
            recebidos por mês
          </h3>
          <ul className="space-y-1.5">
            {interestByMonth.map((m) => (
              <li key={m.key} className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="w-16 shrink-0 capitalize text-muted-foreground">
                  {m.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(4, (m.total / maxInterest) * 100)}%` }}
                  />
                </div>
                <span className="shrink-0 font-semibold text-primary">
                  {formatCurrency(m.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
