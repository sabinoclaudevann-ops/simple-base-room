import { useEffect, useState } from "react";
import { Check, CircleDollarSign, RotateCcw, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { AppData, Contract } from "@/lib/qjuros/types";
import {
  applyPartialPayment,
  calculateInterest,
  formatCurrency,
  formatDate,
  getClientName,
  getInstallmentsForContract,
  isInterestOnlyInstallment,
  isOverdue,
  nextDueDate,
  partialRemaining,
  todayISO,
} from "@/lib/qjuros/logic";
import { PartialPayDialog } from "./PartialPayDialog";

type Filter = "all" | "pending" | "paid" | "overdue";

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  confirm: (msg: string) => Promise<boolean>;
  initialFilter?: Filter;
}

export function InstallmentsTab({ data, update, confirm, initialFilter }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>(initialFilter ?? "all");
  const [partialId, setPartialId] = useState<number | null>(null);

  useEffect(() => {
    if (initialFilter) setFilter(initialFilter);
  }, [initialFilter]);

  const searchLower = search.trim().toLowerCase();

  const filtered = data.installments
    .filter((i) => !i.deleted)
    .filter((i) => {
      const contract = data.contracts.find((c) => c.id === i.contractId);
      const clientName = getClientName(data, contract?.clientId ?? 0).toLowerCase();
      const matchesSearch =
        !searchLower ||
        clientName.includes(searchLower) ||
        String(i.contractId).includes(searchLower) ||
        String(i.number).includes(searchLower);

      if (!matchesSearch) return false;

      if (filter === "pending") return !i.paid;
      if (filter === "paid") return i.paid;
      if (filter === "overdue") return !i.paid && isOverdue(i);
      return true;
    })
    .sort((a, b) => {
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const payPartial = (installmentId: number, amount: number) => {
    let mode = "none" as "capital" | "partial" | "none";
    update((draft) => {
      mode = applyPartialPayment(draft, installmentId, amount);
    });
    setPartialId(null);
    if (mode === "capital") toast.success("Capital abatido e enviado ao caixa!");
    else if (mode === "partial") toast.success("Pagamento parcial registrado!");
  };

  const clearPartial = (installmentId: number) => {
    update((draft) => {
      const inst = draft.installments.find((i) => i.id === installmentId);
      if (!inst || !inst.paidAmount) return;
      const contract = draft.contracts.find((c) => c.id === inst.contractId);
      if (contract) contract.totalPaid -= inst.paidAmount;
      inst.paidAmount = 0;
    });
    toast.success("Pagamentos parciais desfeitos");
  };

  const pay = (installmentId: number) => {
    update((draft) => {
      const inst = draft.installments.find((i) => i.id === installmentId);
      if (!inst || inst.paid || inst.deleted) return;
      const contract = draft.contracts.find((c) => c.id === inst.contractId);
      if (!contract || !contract.active) return;

      inst.paid = true;
      inst.paidDate = todayISO();
      contract.totalPaid += inst.total - (inst.paidAmount ?? 0);
      inst.paidAmount = inst.total;

      const all = getInstallmentsForContract(draft, contract.id);
      if (contract.type === "installments") {
        if (all.every((i) => i.paid)) {
          contract.active = false;
          contract.deleted = true;
          draft.trash.contracts.push({ ...contract });
          draft.contracts = draft.contracts.filter((c) => c.id !== contract.id);
          draft.installments = draft.installments.filter((i) => i.contractId !== contract.id);
        }
      } else {
        const maxNumber = Math.max(...all.map((i) => i.number));
        if (inst.number === maxNumber) {
          const interest = calculateInterest(contract.capital, contract.rate, contract.frequency);
          contract.nextInstallmentNumber = inst.number + 1;
          const newId = draft.nextId++;
          draft.installments.push({
            id: newId,
            contractId: contract.id,
            number: contract.nextInstallmentNumber,
            total: interest,
            interest,
            dueDate: nextDueDate(inst.dueDate, contract.frequency, 1),
            paid: false,
            paidDate: null,
            deleted: false,
            generatedInstallmentId: null,
          });
          inst.generatedInstallmentId = newId;
        }
      }
    });
    toast.success("Baixa realizada com sucesso!");
  };

  const undo = async (installmentId: number) => {
    const inst = data.installments.find((i) => i.id === installmentId);
    if (!inst || !inst.paid) return;
    const generated = inst.generatedInstallmentId
      ? data.installments.find((i) => i.id === inst.generatedInstallmentId && !i.deleted)
      : null;
    if (generated?.paid) {
      toast.error("Desfaça primeiro a baixa da parcela mais recente");
      return;
    }
    const ok = await confirm(
      generated
        ? `Voltar a parcela ${inst.number} para pendente?\nIsso também vai remover a parcela ${generated.number}, gerada automaticamente por essa baixa.`
        : `Voltar a parcela ${inst.number} para pendente?`,
    );
    if (!ok) return;

    update((draft) => {
      const target = draft.installments.find((i) => i.id === installmentId);
      const contract = draft.contracts.find((c) => c.id === target?.contractId);
      if (!target || !contract) return;
      if (target.generatedInstallmentId) {
        draft.installments = draft.installments.filter((i) => i.id !== target.generatedInstallmentId);
        contract.nextInstallmentNumber = target.number;
      }
      target.paid = false;
      target.paidDate = null;
      target.generatedInstallmentId = null;
      target.paidAmount = 0;
      contract.totalPaid -= target.total;
      contract.active = true;
    });
    toast.success("Parcela voltou para pendente!");
  };

  const setDueDate = (installmentId: number, value: string) => {
    if (!value) return;
    update((draft) => {
      const inst = draft.installments.find((i) => i.id === installmentId);
      if (inst) inst.dueDate = value;
    });
    toast.success("Vencimento atualizado!");
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todas" },
    { id: "pending", label: "Pendentes" },
    { id: "overdue", label: "Vencidas" },
    { id: "paid", label: "Pagas" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            className="q-input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, contrato ou parcela"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto rounded-full bg-secondary p-1">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          {search || filter !== "all" ? "Nenhuma parcela encontrada" : "Nenhuma parcela cadastrada"}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((i) => {
            const contract = data.contracts.find((c) => c.id === i.contractId);
            const clientName = getClientName(data, contract?.clientId ?? 0);
            return (
              <li
                key={i.id}
                className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{clientName}</span>
                    <span className="text-xs text-muted-foreground">
                      Contrato #{i.contractId} · Parcela {i.number}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {contract && (
                      <>
                        {formatCurrency(contract.capital)} · {contract.rate}% ao mês ·{" "}
                        {contract.type === "installments" ? "Parcelado" : "Somente juros"}
                      </>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs">
                    <Wallet className="size-3 text-primary" />
                    <span className="font-semibold">{formatCurrency(i.total)}</span>
                    {contract?.type === "installments" && (
                      <span className="text-muted-foreground">
                        (amort. {formatCurrency(i.amortization ?? 0)} + juros {formatCurrency(i.interest)})
                      </span>
                    )}
                  </div>
                  {!i.paid && (i.paidAmount ?? 0) > 0 && (
                    <p className="mt-1 text-xs font-semibold text-primary">
                      Pago {formatCurrency(i.paidAmount ?? 0)} · falta{" "}
                      {formatCurrency(i.total - (i.paidAmount ?? 0))}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {i.paid ? (
                    <span className="q-tag is-paid">Paga {formatDate(i.paidDate ?? "")}</span>
                  ) : (i.paidAmount ?? 0) > 0 ? (
                    <span className="q-tag">Parcial</span>
                  ) : isOverdue(i) ? (
                    <span className="q-tag is-overdue">Vencida</span>
                  ) : (
                    <span className="q-tag">Pendente</span>
                  )}
                  <input
                    type="date"
                    className="rounded-full border border-border-strong bg-card px-2 py-1 text-[0.68rem]"
                    value={i.dueDate}
                    onChange={(e) => setDueDate(i.id, e.target.value)}
                  />
                  {i.paid ? (
                    <button className="q-btn q-btn-ghost" onClick={() => undo(i.id)}>
                      <RotateCcw className="size-3.5" /> Desfazer
                    </button>
                  ) : (
                    <>
                      <button className="q-btn q-btn-ghost" onClick={() => setPartialId(i.id)}>
                        <CircleDollarSign className="size-3.5" /> Parcial
                      </button>
                      {(i.paidAmount ?? 0) > 0 && (
                        <button className="q-btn q-btn-ghost" onClick={() => clearPartial(i.id)}>
                          <RotateCcw className="size-3.5" /> Desfazer parcial
                        </button>
                      )}
                      <button className="q-btn q-btn-ghost is-accent" onClick={() => pay(i.id)}>
                        <Check className="size-3.5" /> Baixa
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PartialPayDialog
        open={partialId !== null}
        remaining={partialId !== null ? partialRemaining(data, partialId) : 0}
        title={
          partialId !== null && isInterestOnlyInstallment(data, partialId)
            ? "Abater do capital"
            : "Pagamento parcial"
        }
        onCancel={() => setPartialId(null)}
        onConfirm={(amount) => partialId !== null && payPartial(partialId, amount)}
      />
    </div>
  );
}
