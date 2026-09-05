import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, HandCoins, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { AppData } from "@/lib/qjuros/types";
import {
  formatCurrency,
  formatDate,
  getCashBalance,
  getCashReturned,
  getClientName,
  getManualIn,
  getManualOut,
  getOutstandingCapital,
  todayISO,
} from "@/lib/qjuros/logic";

type Movement =
  | { kind: "entry"; id: string; date: string; description: string; amount: number; type: "in" | "out"; entryId: number }
  | { kind: "installment"; id: string; date: string; description: string; amount: number; type: "in" };

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  confirm: (msg: string) => Promise<boolean>;
}

export function CaixaTab({ data, update, confirm }: Props) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());

  const contractById = new Map(data.contracts.map((c) => [c.id, c]));

  const movements: Movement[] = [
    ...(data.cashEntries ?? []).map((e): Movement => ({
      kind: "entry",
      id: `e-${e.id}`,
      date: e.date,
      description: e.description,
      amount: e.amount,
      type: e.type,
      entryId: e.id,
    })),
    ...data.installments
      .filter((i) => i.paid && !i.deleted)
      .map((i): Movement | null => {
        const contract = contractById.get(i.contractId);
        const amount = contract?.type === "installments" ? i.total : (i.amortization ?? 0);
        if (amount <= 0) return null;
        const clientName = contract ? getClientName(data, contract.clientId) : "Cliente removido";
        return {
          kind: "installment",
          id: `i-${i.id}`,
          date: i.paidDate || i.dueDate,
          description: `Parcela ${i.number} · ${clientName}`,
          amount,
          type: "in",
        };
      })
      .filter((m): m is Movement => m !== null),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const addEntry = (type: "in" | "out") => {
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Digite um valor válido");
      return;
    }
    update((draft) => {
      if (!draft.cashEntries) draft.cashEntries = [];
      draft.cashEntries.push({
        id: draft.nextId++,
        type,
        amount: value,
        description:
          description.trim() || (type === "in" ? "Entrada manual" : "Sangria"),
        date: date || todayISO(),
        createdAt: new Date().toISOString(),
      });
    });
    setAmount("");
    setDescription("");
    toast.success(type === "in" ? "Entrada registrada no caixa!" : "Sangria registrada!");
  };

  const removeEntry = async (id: number) => {
    const ok = await confirm("Remover este lançamento do caixa?");
    if (!ok) return;
    update((draft) => {
      draft.cashEntries = (draft.cashEntries ?? []).filter((e) => e.id !== id);
    });
    toast.success("Lançamento removido");
  };

  const balance = getCashBalance(data);
  const returned = getCashReturned(data);
  const manualIn = getManualIn(data);
  const manualOut = getManualOut(data);
  const capitalOut = getOutstandingCapital(data);
  const pending = data.installments
    .filter((i) => !i.paid && !i.deleted)
    .reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-4">
      <div className="q-stat p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Wallet className="size-4 text-primary" /> Saldo em caixa
        </div>
        <div
          className={`mt-1 text-2xl font-bold tracking-tight ${
            balance < 0 ? "text-destructive" : "text-primary"
          }`}
        >
          {formatCurrency(balance)}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Dinheiro que voltou {formatCurrency(returned)} + entradas {formatCurrency(manualIn)} −
          sangrias {formatCurrency(manualOut)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="q-stat p-3">
          <p className="text-[11px] font-semibold text-muted-foreground">Capital na rua</p>
          <p className="mt-0.5 text-base font-bold text-accent">{formatCurrency(capitalOut)}</p>
        </div>
        <div className="q-stat p-3">
          <p className="text-[11px] font-semibold text-muted-foreground">Falta voltar</p>
          <p className="mt-0.5 text-base font-bold text-warning">{formatCurrency(pending)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_1fr] sm:items-end">
        <div>
          <label className="q-label">Valor (R$)</label>
          <input
            className="q-input"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
          />
        </div>
        <div>
          <label className="q-label">Descrição</label>
          <input
            className="q-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: aporte, retirada"
          />
        </div>
        <div>
          <label className="q-label">Data</label>
          <input
            className="q-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="q-btn q-btn-primary" onClick={() => addEntry("in")}>
          <ArrowDownCircle className="size-4" /> Adicionar
        </button>
        <button className="q-btn q-btn-ghost is-danger" onClick={() => addEntry("out")}>
          <ArrowUpCircle className="size-4" /> Sangria
        </button>
      </div>

      {movements.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhuma movimentação no caixa
        </p>
      ) : (
        <ul className="space-y-2">
          {movements.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {m.kind === "installment" && (
                  <HandCoins className="size-4 shrink-0 text-primary" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{m.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(m.date)} ·{" "}
                    {m.kind === "installment"
                      ? "Recebimento"
                      : m.type === "in"
                        ? "Entrada"
                        : "Sangria"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    m.type === "in" ? "text-primary" : "text-destructive"
                  }`}
                >
                  {m.type === "in" ? "+" : "−"} {formatCurrency(m.amount)}
                </span>
                {m.kind === "entry" && (
                  <button
                    className="q-btn q-btn-ghost is-danger"
                    onClick={() => removeEntry(m.entryId)}
                    aria-label="Remover lançamento"
                  >
                    <Trash2 className="size-3.5" />
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
