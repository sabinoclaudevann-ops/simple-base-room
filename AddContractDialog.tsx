import { useMemo, useState } from "react";
import { Calculator, CircleDollarSign, FileSignature, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import type { AppData, ContractType } from "@/lib/qjuros/types";
import {
  calculateInterest,
  formatCurrency,
  formatDate,
  frequencyLabel,
  nextDueDate,
  todayISO,
} from "@/lib/qjuros/logic";

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (type: ContractType) => void;
}

export function AddContractDialog({ data, update, open, onOpenChange, onCreated }: Props) {
  const [type, setType] = useState<ContractType>("interest_only");
  const [frequency, setFrequency] = useState<"monthly" | "biweekly">("monthly");
  const [clientId, setClientId] = useState("");
  const [capital, setCapital] = useState("");
  const [rate, setRate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [count, setCount] = useState("");

  const simulation = useMemo(() => {
    const cap = parseFloat(capital);
    const rt = parseFloat(rate);
    if (!cap || cap <= 0 || !rt || rt <= 0) return null;
    const start = startDate || todayISO();
    const interest = calculateInterest(cap, rt, frequency);
    if (type === "installments") {
      const n = parseInt(count);
      if (!n || n < 1) return null;
      const amortization = cap / n;
      const perInstallment = amortization + interest;
      return {
        capital: cap,
        interest,
        count: n,
        perInstallment,
        firstDue: nextDueDate(start, frequency, 1),
        lastDue: nextDueDate(start, frequency, n),
        totalToReceive: perInstallment * n,
        totalInterest: interest * n,
      };
    }
    return {
      capital: cap,
      interest,
      count: 1,
      perInstallment: interest,
      firstDue: nextDueDate(start, frequency, 1),
      lastDue: nextDueDate(start, frequency, 1),
      totalToReceive: interest,
      totalInterest: interest,
    };
  }, [capital, rate, count, startDate, frequency, type]);



  if (!open) return null;

  const clients = data.clients.filter((c) => !c.deleted);

  const handleCreate = () => {
    const cid = parseInt(clientId);
    const cap = parseFloat(capital);
    const rt = parseFloat(rate);
    if (!cid) {
      toast.error("Selecione um cliente");
      return;
    }
    if (!cap || cap <= 0) {
      toast.error("Digite um capital válido");
      return;
    }
    if (!rt || rt <= 0) {
      toast.error("Digite uma taxa de juros válida");
      return;
    }
    const installmentsCount = type === "installments" ? parseInt(count) : null;
    if (type === "installments" && (!installmentsCount || installmentsCount < 1)) {
      toast.error("Digite um número de parcelas válido");
      return;
    }
    const start = startDate || todayISO();

    update((draft) => {
      const contract = {
        id: draft.nextId++,
        clientId: cid,
        capital: cap,
        rate: rt,
        type,
        frequency,
        installmentsCount,
        startDate: start,
        active: true,
        deleted: false,
        totalPaid: 0,
        nextInstallmentNumber: 1,
      };
      draft.contracts.push(contract);
      // O capital do novo contrato sai do caixa
      const clientName = draft.clients.find((c) => c.id === cid)?.name ?? "Cliente";
      if (!draft.cashEntries) draft.cashEntries = [];
      draft.cashEntries.push({
        id: draft.nextId++,
        type: "out",
        amount: cap,
        description: `Empréstimo — contrato #${contract.id} (${clientName})`,
        date: start,
        createdAt: new Date().toISOString(),
      });
      const interest = calculateInterest(cap, rt, frequency);

      if (type === "installments" && installmentsCount) {
        const amortization = cap / installmentsCount;
        for (let n = 1; n <= installmentsCount; n++) {
          draft.installments.push({
            id: draft.nextId++,
            contractId: contract.id,
            number: n,
            total: amortization + interest,
            interest,
            amortization,
            dueDate: nextDueDate(start, frequency, n),
            paid: false,
            paidDate: null,
            deleted: false,
            generatedInstallmentId: null,
          });
        }
        contract.nextInstallmentNumber = installmentsCount + 1;
      } else {
        draft.installments.push({
          id: draft.nextId++,
          contractId: contract.id,
          number: 1,
          total: interest,
          interest,
          dueDate: nextDueDate(start, frequency, 1),
          paid: false,
          paidDate: null,
          deleted: false,
          generatedInstallmentId: null,
        });
      }
    });

    setCapital("");
    setRate("");
    setStartDate("");
    setCount("");
    setClientId("");
    setFrequency("monthly");
    onOpenChange(false);
    toast.success("Contrato criado!");
    onCreated?.(type);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-4 shadow-2xl sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold">
            <FileSignature className="size-4 text-primary" /> Novo contrato
          </h3>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-full p-1 transition-colors hover:bg-secondary"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <span className="q-label">Tipo de contrato</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                {
                  value: "interest_only" as const,
                  title: "Somente juros",
                  desc: "Cada parcela cobra apenas o juro mensal sobre o capital. A próxima parcela nasce a cada baixa.",
                  icon: CircleDollarSign,
                },
                {
                  value: "installments" as const,
                  title: "Parcelado",
                  desc: "Capital dividido em partes iguais + juro fixo sobre o capital original em toda parcela.",
                  icon: Wallet,
                },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setType(opt.value)}
                className={`rounded-2xl border-[1.5px] bg-secondary p-3 text-left transition-colors ${
                  type === opt.value
                    ? "border-success bg-accent-soft"
                    : "border-border-strong hover:border-primary/40"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <opt.icon className="size-4 text-primary" /> {opt.title}
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          <div>
            <span className="q-label">Receber a cada</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {(
                [
                  { value: "monthly" as const, label: "Mensal (30 dias)" },
                  { value: "biweekly" as const, label: "A cada 15 dias" },
                ]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={`rounded-xl border-[1.5px] px-3 py-2 text-xs font-semibold transition-colors ${
                    frequency === opt.value
                      ? "border-success bg-accent-soft text-foreground"
                      : "border-border-strong bg-secondary text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="q-label">Cliente</label>
              <select
                className="q-input"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="q-label">Capital (R$)</label>
              <input
                type="number"
                step="0.01"
                className="q-input"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div>
              <label className="q-label">Juros por parcela (%)</label>
              <input
                type="number"
                step="0.01"
                className="q-input"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="q-label">Data do contrato</label>
              <input
                type="date"
                className="q-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            {type === "installments" && (
              <div>
                <label className="q-label">Número de parcelas</label>
                <input
                  type="number"
                  min="1"
                  className="q-input"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder="2"
                />
              </div>
            )}
          </div>

          {simulation && (
            <div className="rounded-2xl border-[1.5px] border-border-strong bg-secondary p-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <Calculator className="size-4 text-primary" /> Simulação
              </p>
              <div className="mt-2 space-y-1 text-xs">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Valor de cada parcela</span>
                  <span className="font-semibold">{formatCurrency(simulation.perInstallment)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">
                    {type === "installments" ? "Parcelas" : "Juros por parcela"}
                  </span>
                  <span className="font-semibold">
                    {type === "installments"
                      ? `${simulation.count}x · ${frequencyLabel(frequency)}`
                      : `${formatCurrency(simulation.interest)} · ${frequencyLabel(frequency)}`}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">1º vencimento</span>
                  <span className="font-semibold">{formatDate(simulation.firstDue)}</span>
                </p>
                {type === "installments" && (
                  <>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Último vencimento</span>
                      <span className="font-semibold">{formatDate(simulation.lastDue)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Total a receber</span>
                      <span className="font-semibold">{formatCurrency(simulation.totalToReceive)}</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-muted-foreground">Lucro (juros)</span>
                      <span className="font-bold text-success">
                        {formatCurrency(simulation.totalInterest)}
                      </span>
                    </p>
                  </>
                )}
                {type === "interest_only" && (
                  <p className="text-muted-foreground">
                    Capital de {formatCurrency(simulation.capital)} continua na rua; cada parcela
                    cobra só o juro e uma nova nasce a cada baixa.
                  </p>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            className="q-btn q-btn-accent w-full"
            onClick={handleCreate}
          >
            <FileSignature className="size-4" /> Criar contrato
          </button>
        </div>
      </div>
    </div>
  );
}
