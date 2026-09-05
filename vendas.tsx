import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CalendarClock,
  Check,
  FileText,
  HandCoins,
  Landmark,
  Smartphone,
  Wallet,
} from "lucide-react";

const FEATURES = [
  {
    icon: FileText,
    title: "Contratos completos",
    desc: "Parcelado, somente juros, mensal ou quinzenal. PDF profissional com valor e parcelas na hora.",
  },
  {
    icon: CalendarClock,
    title: "Parcelas sob controle",
    desc: "Vencimentos ordenados, pagamento total ou parcial, abatimento de capital com recálculo de juros.",
  },
  {
    icon: Wallet,
    title: "Caixa automático",
    desc: "Capital sai do caixa ao emprestar e volta com os juros ao receber. Entradas e sangrias manuais.",
  },
  {
    icon: BarChart3,
    title: "Dashboard inteligente",
    desc: "Capital na rua, juro a receber no mês, média de juros do capital e gráfico de juros por mês.",
  },
  {
    icon: Smartphone,
    title: "Dois celulares em sincronia",
    desc: "Instale como app na tela de início e acesse os mesmos dados em qualquer aparelho.",
  },
  {
    icon: BellRing,
    title: "Alerta de vencimento",
    desc: "Notificações quando parcelas estão perto de vencer ou vencidas.",
  },
];

const PLANS = [
  {
    name: "Teste",
    price: "Grátis",
    period: "1 dia",
    highlight: false,
    items: ["Todos os recursos liberados", "Contratos ilimitados", "Sem cartão de crédito"],
  },
  {
    name: "Mensal",
    price: "R$ 35",
    period: "/mês",
    highlight: true,
    items: [
      "Todos os recursos",
      "Sincronização entre aparelhos",
      "Suporte direto no WhatsApp",
    ],
  },
];

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "Q+Gestão — Sistema de gestão de empréstimos" },
      {
        name: "description",
        content:
          "Controle contratos, parcelas, juros e caixa dos seus empréstimos. Sincroniza entre celulares e gera PDF. Teste grátis de 1 dia e plano mensal de R$ 35.",
      },
      { property: "og:title", content: "Q+Gestão — Sistema de gestão de empréstimos" },
      {
        property: "og:description",
        content:
          "Contratos, parcelas, caixa e dashboard de juros em um app simples. Teste grátis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendasPage,
});

function VendasPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="size-4" />
            </span>
            <span className="text-lg font-bold tracking-tight">Q+Gestão</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Entrar
            </Link>
            <Link
              to="/"
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Testar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:pt-20">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
          <HandCoins className="size-3.5 text-primary" />
          Para quem empresta dinheiro
        </span>
        <h1 className="mx-auto mt-5 max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Seus empréstimos sob controle, <span className="text-primary">onde você estiver</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
          Contratos, parcelas, juros e caixa em um app simples. Sincroniza entre
          aparelhos e gera PDF profissional.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
          >
            Começar teste grátis <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          1 dia grátis automático · sem cartão de crédito · depois R$ 35/mês
        </p>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Tudo que você precisa para emprestar com segurança
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          Planos simples, sem surpresa
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Teste 1 dia grátis automático. Depois, R$ 35 por mês — sem fidelidade.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 ${
                plan.highlight
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold text-primary-foreground">
                  MAIS ESCOLHIDO
                </span>
              )}
              <h3 className="text-sm font-semibold text-muted-foreground">{plan.name}</h3>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {plan.price}
                <span className="text-sm font-medium text-muted-foreground"> {plan.period}</span>
              </p>
              <ul className="mt-5 space-y-2.5">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/"
                className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                Começar agora
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pare de anotar empréstimo em caderno
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Em 2 minutos você cria sua conta, cadastra o primeiro contrato e já vê
            quanto tem na rua e quanto vai receber de juro.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.02]"
          >
            Criar minha conta grátis <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold text-foreground">
            <Landmark className="size-3.5 text-primary" /> Q+Gestão
          </span>
          <span>Gestão de empréstimos simples e segura</span>
        </div>
      </footer>
    </div>
  );
}
