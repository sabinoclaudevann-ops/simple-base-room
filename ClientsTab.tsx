import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { AppData } from "@/lib/qjuros/types";
import { archiveContract, formatDate, getClientContracts, todayISO } from "@/lib/qjuros/logic";

interface Props {
  data: AppData;
  update: (fn: (draft: AppData) => void) => void;
  confirm: (msg: string) => Promise<boolean>;
}

export function ClientsTab({ data, update, confirm }: Props) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const addClient = () => {
    if (!name.trim()) {
      toast.error("Digite o nome do cliente");
      return;
    }
    update((draft) => {
      draft.clients.push({
        id: draft.nextId++,
        name: name.trim(),
        contact: contact.trim() || "Sem contato cadastrado",
        createdAt: todayISO(),
        deleted: false,
      });
    });
    setName("");
    setContact("");
    toast.success("Cliente cadastrado!");
  };

  const removeClient = async (id: number) => {
    const ok = await confirm("Mover este cliente e seus contratos para a lixeira?");
    if (!ok) return;
    update((draft) => {
      const client = draft.clients.find((c) => c.id === id);
      if (!client) return;
      client.deleted = true;
      draft.trash.clients.push({ ...client });
      draft.clients = draft.clients.filter((c) => c.id !== id);
      draft.contracts
        .filter((c) => c.clientId === id && !c.deleted)
        .forEach((c) => archiveContract(draft, c));
    });
    toast.success("Movido para a lixeira");
  };

  const activeClients = data.clients.filter((c) => !c.deleted);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label className="q-label">Nome do cliente</label>
          <input
            className="q-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: João Silva"
          />
        </div>
        <div>
          <label className="q-label">Contato</label>
          <input
            className="q-input"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Telefone ou email"
          />
        </div>
        <button className="q-btn q-btn-primary" onClick={addClient}>
          <UserPlus className="size-4" /> Adicionar
        </button>
      </div>

      {activeClients.length === 0 ? (
        <p className="rounded-2xl bg-secondary px-4 py-8 text-center text-sm text-muted-foreground">
          Nenhum cliente cadastrado
        </p>
      ) : (
        <ul className="space-y-2">
          {activeClients.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-secondary px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.contact} · desde {formatDate(c.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="q-tag">{getClientContracts(data, c.id).length} contrato(s)</span>
                <button
                  className="q-btn q-btn-ghost is-danger"
                  onClick={() => removeClient(c.id)}
                  aria-label={`Remover ${c.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
