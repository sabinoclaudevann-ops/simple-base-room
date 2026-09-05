import { useState } from "react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileDown,
  Pencil,
  RotateCcw,
  Trash2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import type { AppData, ContractType } from "@/lib/qjuros/types";
import {
  applyPartialPayment,
  archiveContract,
  calculateInterest,
  contractTypeLabel,
  formatCurrency,
  formatDate,
  frequencyLabel,
  getCapitalByType,
  getClientName,
  getInstallmentsForContract,
  isInterestOnlyInstallment,
  isOverdue,
  nextDueDate,
  partialRemaining,
  todayISO,
  undoCapitalAbatement,
} from "@/lib/qjuros/logic";

import { generateContractPDF } from "@/lib/qjuros/pdf";
import { PartialPayDialog } from "./PartialPayDialog";

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  confirm: (msg: string) => Promise<boolean>;
  initialListType?: ContractType | undefined;
}

export function ContractsTab({ data, update, confirm, initialListType }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [edit, setEdit] = useState({ clientId: "", capital: "", rate: "" });
  const [search, setSearch] = useState("");
  const [listType, setListType] = useState<ContractType>(initialListType ?? "installments");
  const [expanded, setExpanded] = useState<number[]>([]);
  const [partialId, setPartialId] = useState<number | null>(null);
  const toggleExpanded = (id: number) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const clients = data.clients.filter((c) => !c.deleted);
  const searchLower = search.trim().toLowerCase();
  const contracts = data.contracts.filter((c) => {
    if (c.deleted) return false;
    if (c.type !== listType) return false;
    if (!searchLower) return true;
    const client = data.clients.find((cl) => cl.id === c.clientId);
    const clientName = client?.name.toLowerCase() ?? "";
    return clientName.includes(searchLower) || String(c.id).includes(searchLower);
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

  const undoAbatement = async (contractId: number, abatementId: number) => {
    const ok = await confirm(
      "Desfazer este abatimento? O valor volta para o capital emprestado e sai do caixa.",
    );
    if (!ok) return;
    let done = false;
    update((draft) => {
      done = undoCapitalAbatement(draft, contractId, abatementId);
    });
    if (done) toast.success("Abatimento desfeito!");
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

  const payInstallment = (installmentId: number) => {
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
          archiveContract(draft, contract);
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

  const undoPay = async (installmentId: number) => {
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
        draft.installments = draft.installments.filter(
          (i) => i.id !== target.generatedInstallmentId,
        );
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

  const quitContract = async (contractId: number) => {
    const contract = data.contracts.find((c) => c.id === contractId);
    if (!contract) return;
    const ok = await confirm(
      `Deseja quitar o contrato de ${getClientName(data, contract.clientId)}? Ele será movido para a lixeira.`,
    );
    if (!ok) return;
    update((draft) => {
      const target = draft.contracts.find((c) => c.id === contractId);
      if (!target) return;
      draft.installments
        .filter((i) => i.contractId === contractId && !i.paid && !i.deleted)
        .forEach((i) => {
          i.paid = true;
          i.paidDate = todayISO();
          target.totalPaid += i.total;
        });
      target.active = false;
      archiveContract(draft, target);
      draft.contracts = draft.contracts.filter((c) => c.id !== contractId);
      draft.installments = draft.installments.filter((i) => i.contractId !== contractId);
    });
    toast.success("Contrato quitado e movido para a lixeira");
  };

  const trashContract = async (contractId: number) => {
    const ok = await confirm("Mover este contrato para a lixeira?");
    if (!ok) return;
    update((draft) => {
      const contract = draft.contracts.find((c) => c.id === contractId);
      if (!contract) return;
      archiveContract(draft, contract);
      draft.contracts = draft.contracts.filter((c) => c.id !== contractId);
      draft.installments = draft.installments.filter((i) => i.contractId !== contractId);
    });
    toast.success("Movido para a lixeira");
  };

  const startEdit = (contractId: number) => {
    const contract = data.contracts.find((c) => c.id === contractId);
    if (!contract) return;
    setEditingId(editingId === contractId ? null : contractId);
    setEdit({
      clientId: String(contract.clientId),
      capital: String(contract.capital),
      rate: String(contract.rate),
    });
  };

  const saveEdit = (contractId: number) => {
    const cid = parseInt(edit.clientId);
    const cap = parseFloat(edit.capital);
    const rt = parseFloat(edit.rate);
    if (!cid) { toast.error("Selecione um cliente"); return; }
    if (!cap || cap <= 0) { toast.error("Digite um capital válido"); return; }
    if (!rt || rt <= 0) { toast.error("Digite uma taxa de juros válida"); return; }

    update((draft) => {
      const contract = draft.contracts.find((c) => c.id === contractId);
      if (!contract) return;
      contract.clientId = cid;
      contract.capital = cap;
      contract.rate = rt;
      const interest = calculateInterest(cap, rt, contract.frequency);
      const pending = draft.installments.filter(
        (i) => i.contractId === contractId && !i.paid && !i.deleted,
      );
      if (contract.type === "installments" && contract.installmentsCount) {
        const amortization = cap / contract.installmentsCount;
        pending.forEach((i) => {
          i.amortization = amortization;
          i.interest = interest;
          i.total = amortization + interest;
        });
      } else {
        pending.forEach((i) => {
          i.interest = interest;
          i.total = interest;
        });
      }
    });
    setEditingId(null);
    toast.success("Contrato atualizado!");
  };

  const setContractStartDate = (contractId: number, value: string) => {
    if (!value) return;
    update((draft) => {
      const contract = draft.contracts.find((c) => c.id === contractId);
      if (contract) contract.startDate = value;
    });
    toast.success("Data do contrato atualizada!");
  };

  const setDueDate = (installmentId: number, value: string) => {
    if (!value) return;
    update((draft) => {
      const inst = draft.installments.find((i) => i.id === installmentId);
      if (inst) inst.dueDate = value;
    });
    toast.success("Vencimento atualizado!");
  };

  return (
    <div className="space-y-5">
      {/* Sub-abas */}
      <nav className="flex gap-1 rounded-full bg-secondary p-1">
        {(
          [
            { id: "installments" as const, label: "Contratos Parcelados", icon: Wallet },
            { id: "interest_only" as const, label: "Contratos Só Juros", icon: CircleDollarSign },
          ]
        ).map(({ id, label, icon: Icon }) => {
          const total = data.contracts.filter((c) => !c.deleted && c.type === id).length;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setListType(id)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                listType === id
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" /> {label} ({total})
            </button>
          );
        })}
      </nav>

      {/* Resumo por modalidade */}
      <div className="grid gap-2 sm:grid-cols-2">
        {getCapitalByType(data).map(({ type, label, total, count }) => {
          const Icon = type === "installments" ? Wallet : CircleDollarSign;
          return (
            <div
              key={type}
              className="flex items-center justify-between rounded-2xl border border-border bg-card p-3"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                  <p className="text-sm font-bold">{formatCurrency(total)}</p>
                </div>
              </div>
              <span className="q-tag">{count} contrato(s)</span>
            </div>
          );
        })}
      </div>

      {/* Lista */}
      <div>
        <label className="q-label">Buscar por cliente ou nº do contrato</label>

        <input
          type="text"
          className="q-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ex: João ou 12"
        />
      </div>

      {contracts.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          {search ? "Nenhum contrato encontrado" : "Nenhum contrato cadastrado nesta aba"}
        </p>
      ) : (
        <ul className="space-y-3">
          {contracts
            .slice()
            .sort((a, b) => b.id - a.id)
            .map((contract) => {
            const installments = getInstallmentsForContract(data, contract.id).sort(
              (a, b) => a.number - b.number,
            );
            const isOpen = expanded.includes(contract.id);
            const pendentes = installments.filter((i) => !i.paid).length;
            return (
              <li key={contract.id} className="rounded-2xl border border-border bg-card p-4">
                <button
                  type="button"
                  onClick={() => toggleExpanded(contract.id)}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      #{contract.id} · {getClientName(data, contract.clientId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(contract.capital)} · {contract.rate}% ·{" "}
                      {frequencyLabel(contract.frequency)} · {contractTypeLabel(contract.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {installments.length} parcelas · {pendentes} pendentes
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="q-tag is-paid">
                      Recebido {formatCurrency(contract.totalPaid)}
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>

                {isOpen && (
                  <>


                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="q-tag">
                    <CalendarClock className="size-3" /> Início
                    <input
                      type="date"
                      className="bg-transparent text-[0.68rem] font-semibold outline-none"
                      value={contract.startDate}
                      onChange={(e) => setContractStartDate(contract.id, e.target.value)}
                    />
                  </label>
                  <button className="q-btn q-btn-ghost" onClick={() => startEdit(contract.id)}>
                    <Pencil className="size-3.5" /> Editar
                  </button>
                  <button
                    className="q-btn q-btn-ghost is-accent"
                    onClick={() => quitContract(contract.id)}
                  >
                    <Check className="size-3.5" /> Quitar
                  </button>
                  <button
                    className="q-btn q-btn-ghost"
                    onClick={() => generateContractPDF(data, contract, installments)}
                  >
                    <FileDown className="size-3.5" /> PDF
                  </button>
                  <button
                    className="q-btn q-btn-ghost is-danger"
                    onClick={() => trashContract(contract.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {(contract.capitalAbatements?.length ?? 0) > 0 && (
                  <div className="mt-3 rounded-xl bg-secondary p-3">
                    <p className="text-xs font-bold">Abatimentos de capital</p>
                    <ul className="mt-1 space-y-1">
                      {(contract.capitalAbatements ?? []).map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-muted-foreground">
                            {formatDate(a.date)} · {formatCurrency(a.amount)}
                          </span>
                          <button
                            className="q-btn q-btn-ghost"
                            onClick={() => undoAbatement(contract.id, a.id)}
                          >
                            <RotateCcw className="size-3.5" /> Desfazer
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {editingId === contract.id && (
                  <div className="mt-3 grid gap-2 rounded-xl bg-secondary p-3 sm:grid-cols-4 sm:items-end">
                    <div>
                      <label className="q-label">Cliente</label>
                      <select
                        className="q-input"
                        value={edit.clientId}
                        onChange={(e) => setEdit({ ...edit, clientId: e.target.value })}
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="q-label">Capital</label>
                      <input
                        type="number"
                        step="0.01"
                        className="q-input"
                        value={edit.capital}
                        onChange={(e) => setEdit({ ...edit, capital: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="q-label">Juros (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="q-input"
                        value={edit.rate}
                        onChange={(e) => setEdit({ ...edit, rate: e.target.value })}
                      />
                    </div>
                    <button className="q-btn q-btn-primary" onClick={() => saveEdit(contract.id)}>
                      Salvar
                    </button>
                  </div>
                )}

                <ul className="mt-3 space-y-2">
                  {installments.map((i) => (
                    <li
                      key={i.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
                    >
                      <div className="text-xs">
                        <p className="font-semibold">
                          Parcela {i.number} · {formatCurrency(i.total)}
                        </p>
                        <p className="text-muted-foreground">
                          {contract.type === "installments" &&
                            `amort. ${formatCurrency(i.amortization ?? 0)} + juros ${formatCurrency(i.interest)} · `}
                          vence {formatDate(i.dueDate)}
                        </p>
                        {!i.paid && (i.paidAmount ?? 0) > 0 && (
                          <p className="font-semibold text-primary">
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
                          <button className="q-btn q-btn-ghost" onClick={() => undoPay(i.id)}>
                            <RotateCcw className="size-3.5" /> Desfazer
                          </button>
                        ) : (
                          <>
                            <button
                              className="q-btn q-btn-ghost"
                              onClick={() => setPartialId(i.id)}
                            >
                              <CircleDollarSign className="size-3.5" /> Parcial
                            </button>
                            {(i.paidAmount ?? 0) > 0 && (
                              <button
                                className="q-btn q-btn-ghost"
                                onClick={() => clearPartial(i.id)}
                              >
                                <RotateCcw className="size-3.5" /> Desfazer parcial
                              </button>
                            )}
                            <button
                              className="q-btn q-btn-ghost is-accent"
                              onClick={() => payInstallment(i.id)}
                            >
                              <Check className="size-3.5" /> Dar baixa
                            </button>
                          </>
                        )}

                      </div>
                    </li>
                  ))}
                </ul>
                  </>
                )}
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
