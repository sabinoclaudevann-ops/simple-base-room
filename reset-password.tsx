import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/lib/qjuros/theme";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha · Q+Gestão" },
      { name: "description", content: "Crie uma nova senha para acessar o Q+Gestão." },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // O link do email chega com type=recovery no hash; o cliente Supabase
    // detecta automaticamente e dispara o evento PASSWORD_RECOVERY.
    const isRecoveryHash = window.location.hash.includes("type=recovery");
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    if (isRecoveryHash) {
      // dá tempo do cliente processar o hash; se nada acontecer, marca inválido
      const timer = setTimeout(() => {
        setReady((r) => {
          if (!r) setInvalid(true);
          return r;
        });
      }, 4000);
      return () => {
        clearTimeout(timer);
        subscription.unsubscribe();
      };
    }
    setInvalid(true);
    return () => subscription.unsubscribe();
  }, []);

  const submit = async () => {
    if (password.length < 6) {
      toast.error("A senha precisa ter no mínimo 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha redefinida! Entrando…");
      navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <header className="flex items-center gap-3">
        <div
          className="flex size-10 items-center justify-center rounded-xl text-base font-bold text-primary-foreground"
          style={{ background: "var(--gradient-brand)" }}
        >
          Q+
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold tracking-tight">Q+Gestão</h1>
          <p className="text-xs text-muted-foreground">Redefinição de senha</p>
        </div>
        <button
          className="q-btn q-btn-ghost shrink-0"
          onClick={() => void toggle()}
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
        </button>
      </header>

      <section className="q-card space-y-4">
        {invalid && !ready ? (
          <>
            <h2 className="text-lg font-bold tracking-tight">Link inválido ou expirado</h2>
            <p className="text-xs text-muted-foreground">
              Este link de redefinição não é válido ou já expirou. Volte ao app e peça um novo
              em “Esqueci minha senha”.
            </p>
            <button
              className="q-btn q-btn-primary w-full justify-center"
              onClick={() => navigate({ to: "/", replace: true })}
            >
              Voltar ao início
            </button>
          </>
        ) : !ready ? (
          <div className="flex items-center justify-center gap-3 py-6">
            <span className="size-6 animate-spin rounded-full border-[3px] border-border-strong border-t-primary" />
            <span className="text-sm text-muted-foreground">Validando link…</span>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold tracking-tight">Criar nova senha</h2>
            <div>
              <label className="q-label">Nova senha</label>
              <input
                className="q-input"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <div>
              <label className="q-label">Confirmar nova senha</label>
              <input
                className="q-input"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="••••••"
              />
            </div>
            <button
              className="q-btn q-btn-primary w-full justify-center"
              disabled={busy}
              onClick={() => void submit()}
            >
              <KeyRound className="size-4" /> Salvar nova senha
            </button>
          </>
        )}
      </section>
    </main>
  );
}
