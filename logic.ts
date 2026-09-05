import type { AppData, Contract, Installment } from "./types";

export function formatCurrency(value: number) {
  return (
    "R$ " +
    value
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}


export function formatDate(iso: string) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function toLocalISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : toLocalISO(new Date());
}

export function calculateInterest(
  capital: number,
  rate: number,
  frequency?: Contract["frequency"],
) {
  const factor = frequency === "biweekly" ? 0.5 : 1;
  return capital * (rate / 100) * factor;
}

export function addMonths(iso: string, months: number) {
  const date = new Date(iso + "T00:00:00");
  date.setMonth(date.getMonth() + months);
  return toLocalISO(date);
}

export function addDays(iso: string, days: number) {
  const date = new Date(iso + "T00:00:00");
  date.setDate(date.getDate() + days);
  return toLocalISO(date);
}

/** Próximo vencimento conforme a frequência do contrato. */
export function nextDueDate(iso: string, frequency: Contract["frequency"], step = 1) {
  return frequency === "biweekly" ? addDays(iso, 15 * step) : addMonths(iso, step);
}

export const frequencyLabel = (frequency: Contract["frequency"]) =>
  frequency === "biweekly" ? "A cada 15 dias" : "Mensal";

export function isOverdue(installment: Installment) {
  if (installment.paid || installment.deleted) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(installment.dueDate + "T00:00:00");
  return due.getTime() < today.getTime();
}

export function daysOverdue(installment: Installment) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(installment.dueDate + "T00:00:00");
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86400000));
}

export const clone = (data: AppData): AppData =>
  typeof structuredClone === "function"
    ? structuredClone(data)
    : (JSON.parse(JSON.stringify(data)) as AppData);

export const getClientName = (data: AppData, id: number) =>
  data.clients.find((c) => c.id === id)?.name ??
  data.trash.clients.find((c) => c.id === id)?.name ??
  "Cliente removido";

export const getInstallmentsForContract = (data: AppData, contractId: number) =>
  data.installments.filter((i) => i.contractId === contractId && !i.deleted);

export const getClientContracts = (data: AppData, clientId: number) =>
  data.contracts.filter((c) => c.clientId === clientId && !c.deleted);

export const getPendingInstallments = (data: AppData) =>
  data.installments.filter((i) => !i.paid && !i.deleted);

export const getPaidInstallments = (data: AppData) =>
  data.installments.filter((i) => i.paid && !i.deleted);

export const getOverdueInstallments = (data: AppData) =>
  data.installments.filter((i) => isOverdue(i));

/** Soma dos pagamentos parciais em parcelas ainda pendentes. */
export const getPartialPaid = (data: AppData) =>
  data.installments
    .filter((i) => !i.paid && !i.deleted)
    .reduce((s, i) => s + (i.paidAmount ?? 0), 0);

export const getReceivedTotal = (data: AppData) =>
  getPaidInstallments(data).reduce((s, i) => s + i.total, 0) + getPartialPaid(data);

/** Juros recebidos (parte de juros das parcelas pagas). */
export const getInterestReceived = (data: AppData) =>
  getPaidInstallments(data).reduce((s, i) => s + i.interest, 0);

/** Juros que ainda faltam receber nas parcelas pendentes. */
export const getPendingInterest = (data: AppData) =>
  getPendingInstallments(data).reduce((s, i) => s + i.interest, 0);

/** Juros recebidos por mês (agrupado pela data de pagamento), mais recente primeiro. */
export function getInterestByMonth(data: AppData) {
  const map = new Map<string, number>();
  for (const i of getPaidInstallments(data)) {
    const date = i.paidDate || i.dueDate;
    if (!date) continue;
    const key = date.slice(0, 7); // AAAA-MM
    map.set(key, (map.get(key) ?? 0) + i.interest);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, total]) => {
      const [y, m] = key.split("-");
      const date = new Date(Number(y), Number(m) - 1, 1);
      const label = date.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      });
      return { key, label, total };
    });
}

/** Capital que já voltou (parte de amortização das parcelas pagas). */
export const getReturnedCapital = (data: AppData) =>
  getPaidInstallments(data).reduce((s, i) => s + (i.amortization ?? 0), 0);

/** Capital ainda emprestado (na rua): diminui conforme o dinheiro volta. */
export const getOutstandingCapital = (data: AppData) =>
  data.contracts
    .filter((c) => !c.deleted)
    .reduce((s, c) => s + c.capital, 0) - getReturnedCapital(data);

/** Total emprestado por modalidade de contrato. */
export function getCapitalByType(data: AppData) {
  const map = new Map<Contract["type"], { total: number; count: number }>();
  for (const c of data.contracts.filter((c) => !c.deleted)) {
    const entry = map.get(c.type) ?? { total: 0, count: 0 };
    entry.total += c.capital;
    entry.count += 1;
    map.set(c.type, entry);
  }
  return [...map.entries()].map(([type, { total, count }]) => ({
    type,
    label: contractTypeLabel(type),
    total,
    count,
  }));
}

/** Média ponderada da taxa de juros sobre o capital ainda emprestado. */
export function getWeightedAverageRate(data: AppData) {
  const active = data.contracts.filter((c) => !c.deleted);
  if (active.length === 0) return 0;

  const amortByContract = new Map<number, number>();
  for (const i of data.installments) {
    if (i.paid && !i.deleted && (i.amortization ?? 0) > 0) {
      amortByContract.set(
        i.contractId,
        (amortByContract.get(i.contractId) ?? 0) + i.amortization!,
      );
    }
  }

  let weighted = 0;
  let total = 0;
  for (const c of active) {
    const outstanding =
      c.type === "interest_only"
        ? c.capital
        : Math.max(0, c.capital - (amortByContract.get(c.id) ?? 0));
    const monthlyRate = c.rate * (c.frequency === "biweekly" ? 2 : 1);
    weighted += outstanding * monthlyRate;
    total += outstanding;
  }
  return total > 0 ? weighted / total : 0;
}


export const getManualIn = (data: AppData) =>
  (data.cashEntries ?? []).filter((e) => e.type === "in").reduce((s, e) => s + e.amount, 0);

export const getManualOut = (data: AppData) =>
  (data.cashEntries ?? []).filter((e) => e.type === "out").reduce((s, e) => s + e.amount, 0);

/**
 * Dinheiro que voltou para o caixa: contratos parcelados voltam com
 * capital + juros (valor cheio da parcela); contratos de somente juros
 * voltam só com a amortização (juros fica no "recebido").
 */
export const getCashReturned = (data: AppData) => {
  const typeByContract = new Map<number, Contract["type"]>();
  for (const c of [...data.contracts, ...data.trash.contracts]) {
    typeByContract.set(c.id, c.type);
  }
  const paid = getPaidInstallments(data).reduce((s, i) => {
    const type = typeByContract.get(i.contractId);
    return s + (type === "installments" ? i.total : (i.amortization ?? 0));
  }, 0);
  return paid + getPartialPaid(data);
};

/** Caixa = dinheiro que voltou + entradas manuais − sangrias. */
export const getCashBalance = (data: AppData) =>
  getCashReturned(data) + getManualIn(data) - getManualOut(data);

export function archiveContract(data: AppData, contract: Contract) {
  contract.deleted = true;
  data.trash.contracts.push({ ...contract });
  data.installments
    .filter((i) => i.contractId === contract.id && !i.deleted)
    .forEach((i) => {
      i.deleted = true;
      data.trash.installments.push({ ...i });
    });
}

export const contractTypeLabel = (type: Contract["type"]) =>
  type === "installments" ? "Parcelado" : "Somente juros";

/**
 * Quanto pode ser recebido em um pagamento parcial.
 * Somente juros: abate direto do capital emprestado.
 * Parcelado: o que falta da parcela.
 */
export function partialRemaining(data: AppData, installmentId: number) {
  const inst = data.installments.find((i) => i.id === installmentId);
  if (!inst) return 0;
  const contract = data.contracts.find((c) => c.id === inst.contractId);
  if (contract?.type === "interest_only") return contract.capital;
  return inst.total - (inst.paidAmount ?? 0);
}

export const isInterestOnlyInstallment = (data: AppData, installmentId: number) => {
  const inst = data.installments.find((i) => i.id === installmentId);
  const contract = data.contracts.find((c) => c.id === inst?.contractId);
  return contract?.type === "interest_only";
};

/**
 * Aplica um pagamento parcial no rascunho de dados.
 * Contratos "somente juros": o valor abate o capital emprestado, entra no
 * caixa e as parcelas pendentes passam a cobrar juros sobre o novo capital.
 * Contratos "parcelado": mantém o abatimento na própria parcela.
 */
export function applyPartialPayment(
  draft: AppData,
  installmentId: number,
  amount: number,
): "capital" | "partial" | "none" {
  const inst = draft.installments.find((i) => i.id === installmentId);
  if (!inst || inst.paid || inst.deleted || amount <= 0) return "none";
  const contract = draft.contracts.find((c) => c.id === inst.contractId);
  if (!contract || !contract.active) return "none";

  if (contract.type !== "interest_only") {
    inst.paidAmount = (inst.paidAmount ?? 0) + amount;
    contract.totalPaid += amount;
    return "partial";
  }

  const value = Math.min(amount, contract.capital);
  contract.capital = Math.max(0, contract.capital - value);
  contract.totalPaid += value;

  draft.cashEntries = draft.cashEntries ?? [];
  const cashEntryId = draft.nextId++;
  draft.cashEntries.push({
    id: cashEntryId,
    type: "in",
    amount: value,
    description: `Abatimento de capital · contrato #${contract.id}`,
    date: todayISO(),
    createdAt: new Date().toISOString(),
  });

  contract.capitalAbatements = contract.capitalAbatements ?? [];
  contract.capitalAbatements.push({
    id: draft.nextId++,
    amount: value,
    cashEntryId,
    date: todayISO(),
  });

  if (contract.capital <= 0.009) {
    contract.active = false;
    archiveContract(draft, contract);
    draft.contracts = draft.contracts.filter((c) => c.id !== contract.id);
    draft.installments = draft.installments.filter((i) => i.contractId !== contract.id);
    return "capital";
  }

  const interest = calculateInterest(contract.capital, contract.rate, contract.frequency);
  draft.installments
    .filter((i) => i.contractId === contract.id && !i.paid && !i.deleted)
    .forEach((i) => {
      i.interest = interest;
      i.total = interest + (i.amortization ?? 0);
    });
  return "capital";
}

/** Desfaz um abatimento de capital: devolve o valor ao capital, remove do caixa
 *  e recalcula os juros das parcelas pendentes. */
export function undoCapitalAbatement(
  draft: AppData,
  contractId: number,
  abatementId: number,
): boolean {
  const contract = draft.contracts.find((c) => c.id === contractId);
  const abatement = contract?.capitalAbatements?.find((a) => a.id === abatementId);
  if (!contract || !abatement) return false;

  contract.capital += abatement.amount;
  contract.totalPaid -= abatement.amount;
  draft.cashEntries = (draft.cashEntries ?? []).filter(
    (e) => e.id !== abatement.cashEntryId,
  );
  contract.capitalAbatements = (contract.capitalAbatements ?? []).filter(
    (a) => a.id !== abatementId,
  );

  const interest = calculateInterest(contract.capital, contract.rate, contract.frequency);
  draft.installments
    .filter((i) => i.contractId === contract.id && !i.paid && !i.deleted)
    .forEach((i) => {
      i.interest = interest;
      i.total = interest + (i.amortization ?? 0);
    });
  return true;
}
