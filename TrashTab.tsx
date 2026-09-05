import { FileDown, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { AppData } from "@/lib/qjuros/types";
import { contractTypeLabel, formatCurrency, formatDate, getClientName } from "@/lib/qjuros/logic";
import { generateContractPDF } from "@/lib/qjuros/pdf";

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
}

export function TrashTab({ data, update }: Props) {
  const restoreClient = (id: number) => {
    update((draft) => {
      const index = draft.trash.clients.findIndex((c) => c.id === id);
      if (index < 0) return;
      const client = draft.trash.clients.splice(index, 1)[0];
      if (!client) return;
      client.deleted = false;
      draft.clients.push(client);
    });
    toast.success("Cliente restaurado!");
  };

  const restoreContract = (id: number) => {
    update((draft) => {
      const index = draft.trash.contracts.findIndex((c) => c.id === id);
      if (index < 0) return;
      const contract = draft.trash.contracts.splice(index, 1)[0];
      if (!contract) return;
      contract.deleted = false;
      contract.active = true;
      draft.contracts.push(contract);
      const restored = draft.trash.installments.filter((i) => i.contractId === id);
      draft.trash.installments = draft.trash.installments.filter((i) => i.contractId !== id);
      restored.forEach((i) => {
        i.deleted = false;
        draft.installments.push(i);
      });
    });
    toast.success("Contrato restaurado!");
  };

  const empty = data.trash.clients.length === 0 && data.trash.contracts.length === 0;

  if (empty) {
    return (
      <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
        A lixeira está vazia
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {data.trash.clients.length > 0 && (
        <div className="space-y-2">
          <p className="q-label">Clientes</p>
          {data.trash.clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">{c.contact}</p>
              </div>
              <button className="q-btn q-btn-ghost is-accent" onClick={() => restoreClient(c.id)}>
                <Undo2 className="size-3.5" /> Restaurar
              </button>
            </div>
          ))}
        </div>
      )}

      {data.trash.contracts.length > 0 && (
        <div className="space-y-2">
          <p className="q-label">Contratos</p>
          {data.trash.contracts.map((contract) => {
            const installments = data.trash.installments.filter(
              (i) => i.contractId === contract.id,
            );
            return (
              <div
                key={contract.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-secondary px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {getClientName(data, contract.clientId)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatCurrency(contract.capital)} · {contract.rate}% ·{" "}
                    {contractTypeLabel(contract.type)} · desde {formatDate(contract.startDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="q-btn q-btn-ghost"
                    onClick={() => generateContractPDF(data, contract, installments, true)}
                  >
                    <FileDown className="size-3.5" /> PDF
                  </button>
                  <button
                    className="q-btn q-btn-ghost is-accent"
                    onClick={() => restoreContract(contract.id)}
                  >
                    <Undo2 className="size-3.5" /> Restaurar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
