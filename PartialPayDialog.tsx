import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/qjuros/logic";

interface Props {
  open: boolean;
  /** Valor que ainda falta na parcela */
  remaining: number;
  title?: string;
  onCancel: () => void;
  onConfirm: (amount: number) => void;
}

export function PartialPayDialog({ open, remaining, title, onCancel, onConfirm }: Props) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  if (!open) return null;

  const parsed = parseFloat(value.replace(",", "."));
  const valid = !isNaN(parsed) && parsed > 0 && parsed <= remaining + 0.009;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-lg">
        <h3 className="text-base font-bold">{title ?? "Pagamento parcial"}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Falta receber {formatCurrency(remaining)} nesta parcela.
        </p>
        <label className="q-label mt-3 block">Valor recebido agora</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          autoFocus
          className="q-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="0,00"
        />
        {!!value && !valid && (
          <p className="mt-1 text-xs text-destructive">
            Digite um valor entre 0 e {formatCurrency(remaining)}.
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button className="q-btn q-btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="q-btn q-btn-primary"
            disabled={!valid}
            onClick={() => valid && onConfirm(Math.min(parsed, remaining))}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
