import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Clock,
  Crown,
  FileSignature,
  Home,
  Layers,
  ListChecks,
  LogOut,
  Moon,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Trash2,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useDueNotifications } from "@/lib/qjuros/notifications";
import { enableServerPush } from "@/lib/qjuros/push";
import { useBackendHealth } from "@/lib/qjuros/health";
import { BackendAlert } from "@/components/qjuros/BackendAlert";
import { useAppData, useSession } from "@/lib/qjuros/storage";
import { useAccount } from "@/lib/qjuros/account";
import { useTheme } from "@/lib/qjuros/theme";
import type { ContractType } from "@/lib/qjuros/types";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/qjuros/AuthCard";
import { PendingApproval } from "@/components/qjuros/PendingApproval";
import { SubscriptionGate } from "@/components/qjuros/SubscriptionGate";
import { PlanDialog } from "@/components/qjuros/PlanDialog";
import { PLAN_PERIOD_LABEL, PLAN_PRICE_LABEL, hoursLeft, whatsappUrl } from "@/lib/qjuros/billing";
import { AccountsTab } from "@/components/qjuros/AccountsTab";
import { MasterReportTab } from "@/components/qjuros/MasterReportTab";
import { AddContractDialog } from "@/components/qjuros/AddContractDialog";
import { Dashboard, type DashboardDestination } from "@/components/qjuros/Dashboard";
import { ClientsTab } from "@/components/qjuros/ClientsTab";
import { ContractsTab } from "@/components/qjuros/ContractsTab";
import { InstallmentsTab } from "@/components/qjuros/InstallmentsTab";
import { OverdueTab } from "@/components/qjuros/OverdueTab";
import { CaixaTab } from "@/components/qjuros/CaixaTab";
import { TrashTab } from "@/components/qjuros/TrashTab";
import { useConfirm } from "@/components/qjuros/ConfirmDialog";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Q+Gestão · Gestão de Empréstimos" },
      {
        name: "description",
        content:
          "Q+Gestão — controle empréstimos com juros simples mensais: clientes, contratos, parcelas, vencidos e PDF.",
      },
      { property: "og:title", content: "Q+Gestão · Gestão de Empréstimos" },
      {
        property: "og:description",
        content: "Gestão de empréstimos com juros simples: contratos, baixas de parcelas e PDF.",
      },
    ],
  }),
  component: Index,
});

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "contratos", label: "Contratos", icon: FileSignature },
  { id: "parcelas", label: "Parcelas", icon: ListChecks },
  { id: "vencidos", label: "Vencidos", icon: Clock },
  { id: "caixa", label: "Caixa", icon: Wallet },
  { id: "lixeira", label: "Lixeira", icon: Trash2 },
  { id: "contas", label: "Contas", icon: ShieldCheck },
  { id: "master", label: "Relatório Geral", icon: ShieldAlert },
] as const;


const BOTTOM_TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "contratos", label: "Contratos", icon: FileSignature },
  { id: "parcelas", label: "Parcelas", icon: ListChecks },
] as const;

type InstallmentsFilter = "all" | "pending" | "paid" | "overdue";
type TabId = (typeof TABS)[number]["id"];

function Index() {
  const { session, loading: authLoading } = useSession();
  const userId = session?.user.id ?? null;
  const account = useAccount(userId, session?.user.email ?? null);
  // Admin (conta principal) nunca precisa de autorização nem de assinatura
  const approved = account.isAdmin || account.status === "approved";
  const hasAccess = account.hasAccess;
  const { data, update, loading, sync } = useAppData(hasAccess ? userId : null);

  const { confirm, dialog } = useConfirm();
  const [tab, setTab] = useState<TabId>("home");
  const [installmentsFilter, setInstallmentsFilter] = useState<InstallmentsFilter>("all");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [logoTaps, setLogoTaps] = useState(0);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [contractsListType, setContractsListType] = useState<ContractType | undefined>();
  const { status, request, notifyNow, hasAlerts } = useDueNotifications(data, !!session);
  const { theme, toggle: toggleTheme } = useTheme();
  const health = useBackendHealth(hasAccess);

  const alertToastShown = useRef(false);
  useEffect(() => {
    if (loading || !hasAlerts || alertToastShown.current) return;
    // aviso diário: só a partir das 7h e uma vez por dia
    const now = new Date();
    if (now.getHours() < 7) return;
    const key = "qjuros:lastAlertToast";
    const today = now.toISOString().slice(0, 10);
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
    alertToastShown.current = true;
    toast.warning("Atenção: você tem parcelas vencendo ou vencidas", {
      action: {
        label: "Ver parcelas",
        onClick: () => {
          setTab("parcelas");
          setInstallmentsFilter("overdue");
        },
      },
    });
  }, [loading, hasAlerts]);

  const handleNotif = async () => {
    if (status === "unsupported") {
      toast.error("Este navegador não suporta notificações");
      return;
    }
    if (status === "denied") {
      toast.error("Notificações bloqueadas. Libere nas configurações do navegador.");
      return;
    }
    if (status !== "granted") {
      const result = await request();
      if (result !== "granted") {
        toast.error("Permissão de notificação não concedida");
        return;
      }
      toast.success("Avisos ativados! Você será alertado das parcelas a vencer.");
    }
    const push = await enableServerPush();
    if (push === "ok") {
      toast.success("Avisos automáticos ligados: chegam às 7h mesmo com o app fechado.");
    } else if (push === "not-configured") {
      toast.error("Avisos automáticos indisponíveis no momento.");
    } else if (push === "no-service-worker") {
      toast.message("Para receber avisos com o app fechado, instale o app na tela de início.");
    }

    if (!notifyNow(true)) {
      toast.success(
        hasAlerts ? "Avisos ativados!" : "Nenhuma parcela vence hoje e nada está atrasado.",
      );
    }
  };

  const navigateFromDashboard = (dest: DashboardDestination) => {
    switch (dest) {
      case "cash":
        setTab("caixa");
        break;
      case "capital":
        setTab("contratos");
        break;
      case "toReceive":
        setTab("parcelas");
        setInstallmentsFilter("pending");
        break;
      case "overdue":
        setTab("parcelas");
        setInstallmentsFilter("overdue");
        break;
      case "avgRate":
        setTab("contratos");
        break;
    }
  };

  const selectTab = (id: TabId) => {
    setTab(id);
    setAddMenuOpen(false);
  };

  const addClient = () => {
    setAddMenuOpen(false);
    setTab("clientes");
  };

  const addContract = () => {
    setAddMenuOpen(false);
    setContractDialogOpen(true);
  };

  if (authLoading || (userId && (account.loading || (hasAccess && loading)))) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-background">
        <span className="size-8 animate-spin rounded-full border-[3px] border-border-strong border-t-primary" />
        <span className="text-sm text-muted-foreground">Carregando seus dados…</span>
      </div>
    );
  }

  if (!session) return <AuthCard />;

  if (!approved) {
    return (
      <PendingApproval
        email={session.user.email ?? undefined}
        blocked={account.status === "blocked"}
        onRefresh={() => void account.refresh()}
      />
    );
  }

  if (!hasAccess) {
    return (
      <SubscriptionGate
        email={session.user.email ?? undefined}
        supportWhatsApp={account.supportWhatsApp}
        onRefresh={() => void account.refresh()}
      />
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-6 pb-28 sm:pb-6">
      <BackendAlert health={health} />
      {account.inTrial && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
          <Crown className="size-3.5 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            Teste grátis: resta {hoursLeft(account.accessUntil)}h. Plano {PLAN_PRICE_LABEL}
            {PLAN_PERIOD_LABEL}.
          </span>
          <a
            className="q-btn q-btn-primary shrink-0"
            href={whatsappUrl(
              `Quero assinar o Q+Gestão (${PLAN_PRICE_LABEL}${PLAN_PERIOD_LABEL}). Meu e-mail: ${session.user.email ?? ""}`,
              account.supportWhatsApp,
            )}
            target="_blank"
            rel="noreferrer"
          >
            Assinar plano
          </a>
        </div>
      )}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Q+Gestão"
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
            onClick={() => {
              const next = logoTaps + 1;
              setLogoTaps(next);
              if (next >= 5) {
                setLogoTaps(0);
                if (account.isAdmin) {
                  selectTab("master");
                  toast.success("Área secreta liberada");
                }
              }
            }}
          >
            Q+
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight">Q+Gestão</h1>
            <p className="truncate text-xs text-muted-foreground">{session.user.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
          <button
            className="q-btn q-btn-ghost shrink-0"
            onClick={() => void toggleTheme()}
            title={theme === "dark" ? "Modo claro" : "Modo escuro"}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            className={`q-btn q-btn-ghost shrink-0 ${account.inTrial ? "is-accent" : ""}`}
            onClick={() => setPlanDialogOpen(true)}
            title="Meu plano"
          >
            <Crown className="size-3.5" />
            <span className="hidden sm:inline">Plano</span>
          </button>
          <button
            className={`relative q-btn q-btn-ghost shrink-0 ${status === "granted" ? "is-accent" : ""}`}
            onClick={() => void handleNotif()}
            title="Avisos de vencimento"
          >
            {status === "granted" ? <Bell className="size-3.5" /> : <BellOff className="size-3.5" />}
            <span className="hidden sm:inline">Avisos</span>
            {hasAlerts && (
              <span className="absolute -right-0.5 -top-0.5 flex size-2.5 rounded-full bg-destructive ring-2 ring-background" />
            )}
          </button>
          <button
            className={`q-btn q-btn-ghost shrink-0 ${tab === "lixeira" ? "is-danger" : ""}`}
            onClick={() => selectTab("lixeira")}
            title="Lixeira"
          >
            <Trash2 className="size-3.5" />
            <span className="hidden sm:inline">Lixeira</span>
          </button>
          {account.isAdmin && (
            <button
              className={`q-btn q-btn-ghost shrink-0 ${tab === "contas" ? "is-accent" : ""}`}
              onClick={() => selectTab("contas")}
              title="Contas"
            >
              <ShieldCheck className="size-3.5" />
              <span className="hidden sm:inline">Contas</span>
            </button>
          )}
          <button
            className="q-btn q-btn-ghost shrink-0 hidden sm:flex"
            onClick={() => setContractDialogOpen(true)}
            title="Novo contrato"
          >
            <FileSignature className="size-3.5" />{" "}
            <span className="hidden sm:inline">Novo contrato</span>
          </button>
          <button
            className="q-btn q-btn-ghost shrink-0"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="size-3.5" /> <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Desktop top navigation */}
      <nav className="mb-4 hidden gap-1 overflow-x-auto rounded-full bg-secondary p-1 sm:flex">
        {TABS.filter((t) => (t.id === "contas" ? account.isAdmin : t.id === "master" ? account.isAdmin && tab === "master" : true)).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => selectTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
              tab === id
                ? "bg-card text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" /> {label}
          </button>
        ))}
      </nav>

      {tab === "home" ? (
        <Dashboard data={data} onNavigate={navigateFromDashboard} />
      ) : (
        <section className="q-card">
          <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
              <Layers className="size-5 text-primary" /> {TABS.find((t) => t.id === tab)?.label}
            </h2>
            <span className="q-tag">
              {data.clients.filter((c) => !c.deleted).length} clientes ·{" "}
              {data.contracts.filter((c) => !c.deleted).length} contratos
            </span>
          </header>

          {tab === "clientes" && <ClientsTab data={data} update={update} confirm={confirm} />}
          {tab === "contratos" && (
            <ContractsTab
              data={data}
              update={update}
              confirm={confirm}
              initialListType={contractsListType}
            />
          )}
          {tab === "parcelas" && (
            <InstallmentsTab
              data={data}
              update={update}
              confirm={confirm}
              initialFilter={installmentsFilter}
            />
          )}
          {tab === "vencidos" && <OverdueTab data={data} />}
          {tab === "caixa" && <CaixaTab data={data} update={update} confirm={confirm} />}
          {tab === "lixeira" && <TrashTab data={data} update={update} />}
          {tab === "master" &&
            (account.isAdmin ? (
              <MasterReportTab />
            ) : (
              <p className="text-sm text-muted-foreground">Área exclusiva do administrador.</p>
            ))}
          {tab === "contas" &&
            (account.isAdmin ? (
              <AccountsTab currentUserId={session.user.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Área exclusiva do administrador.</p>
            ))}
        </section>
      )}

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Q+Gestão · Juros simples ·{" "}
        {sync === "offline"
          ? "offline — salvo no aparelho, envia ao voltar a internet"
          : sync === "syncing"
            ? "sincronizando…"
            : sync === "pending"
              ? "alterações pendentes de envio"
              : "tudo sincronizado na nuvem"}
      </p>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-3 left-3 right-3 z-40 rounded-2xl border border-border bg-card/95 px-2 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm sm:hidden">
        <div className="grid grid-cols-5 items-end">
          {BOTTOM_TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectTab(id)}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl py-2 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.5px]" : ""}`} />
                <span className="text-[10px] font-semibold">{label}</span>
              </button>
            );
          })}
          <div className="flex flex-col items-center justify-start">
            <button
              type="button"
              onClick={() => setAddMenuOpen(true)}
              className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95"
              aria-label="Adicionar"
            >
              <Plus className="size-6" />
            </button>
          </div>
        </div>
      </nav>

      {/* Add menu overlay */}
      {addMenuOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:hidden"
          onClick={() => setAddMenuOpen(false)}
        >
          <div
            className="mb-24 w-full max-w-sm overflow-hidden rounded-3xl bg-card p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1 p-2">
              <button
                type="button"
                onClick={addClient}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors hover:bg-secondary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm">Novo cliente</span>
                  <span className="text-xs font-normal text-muted-foreground">Cadastrar pessoa na lista</span>
                </span>
              </button>
              <button
                type="button"
                onClick={addContract}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-semibold transition-colors hover:bg-secondary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <FileSignature className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm">Novo contrato</span>
                  <span className="text-xs font-normal text-muted-foreground">Criar empréstimo e parcelas</span>
                </span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setAddMenuOpen(false)}
              className="w-full rounded-2xl bg-secondary px-4 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <AddContractDialog
        data={data}
        update={update}
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
        onCreated={(type) => {
          setTab("contratos");
          setContractsListType(type);
        }}
      />

      {planDialogOpen && (
        <PlanDialog
          account={account}
          email={session.user.email ?? undefined}
          onClose={() => setPlanDialogOpen(false)}
        />
      )}

      {dialog}
    </main>
  );
}
