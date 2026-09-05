import { useEffect, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import type { BackendHealth } from "@/lib/qjuros/health";

export function BackendAlert({ health }: { health: BackendHealth }) {
  const wasDown = useRef(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (health.status === "down" && !wasDown.current) {
      wasDown.current = true;
      toast.error("Servidor indisponível", {
        description:
          "Não conseguimos falar com o servidor. Seus dados seguem salvos no aparelho e sincronizam quando voltar.",
        duration: 10000,
      });
    }
    if (health.status === "online" && wasDown.current) {
      wasDown.current = false;
      toast.success("Servidor voltou ao normal", { description: "Sincronização retomada." });
    }
  }, [health.status]);

  if (health.status !== "down" && health.status !== "offline") return null;

  const offline = health.status === "offline";

  // Tenta várias vezes seguidas: quando o servidor está acordando, a primeira
  // tentativa pode falhar mas a segunda já responde.
  const handleRetry = async () => {
    if (checking) return;
    setChecking(true);
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        // Para assim que o servidor responder — o aviso some na hora.
        if (await health.checkNow()) return;
        if (attempt < 4) await new Promise((r) => setTimeout(r, 2000));
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5">
      {offline ? (
        <WifiOff className="mt-0.5 size-4 shrink-0 text-destructive" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-destructive">
          {offline ? "Sem internet" : "Servidor indisponível"}
        </p>
        <p className="text-xs text-muted-foreground">
          {offline
            ? "Você está usando o app offline. Tudo é salvo no aparelho e sincroniza depois."
            : checking
              ? "Testando a conexão com o servidor... assim que responder, tudo volta ao normal."
              : "Toque na bolinha ao lado para testar de novo — quando o servidor responder, o aviso some sozinho."}
        </p>
      </div>
      {!offline && (
        <button
          className="q-btn q-btn-ghost shrink-0"
          onClick={() => void handleRetry()}
          disabled={checking}
          title="Testar novamente"
        >
          <RefreshCw className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
