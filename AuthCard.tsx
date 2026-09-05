import { useState } from "react";
import { KeyRound, LogIn, Moon, Sun, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/lib/qjuros/theme";
import { supabase } from "@/integrations/supabase/client";

export function AuthCard() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { theme, toggle } = useTheme();

  const submit = async () => {
    if (mode === "forgot") {
      if (!email.trim()) {
        toast.error("Informe seu email");
        return;
      }
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de redefinição para seu email.");
        setMode("login");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Não foi possível enviar o email");
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!email.trim() || password.length < 6) {
      toast.error("Informe email e senha (mínimo 6 caracteres)");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Conta criada! Confirme seu email. Ao entrar, você terá 1 dia de teste grátis automático.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar");
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
          <p className="text-xs text-muted-foreground">
            Entre para sincronizar celular e tablet
          </p>
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
        <h2 className="text-lg font-bold tracking-tight">
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}
        </h2>
        {mode === "forgot" && (
          <p className="text-xs text-muted-foreground">
            Informe seu email e enviaremos um link para você criar uma nova senha.
          </p>
        )}
        <div>
          <label className="q-label">Email</label>
          <input
            className="q-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && mode === "forgot" && void submit()}
            placeholder="voce@email.com"
          />
        </div>
        {mode !== "forgot" && (
          <div>
            <label className="q-label">Senha</label>
            <input
              className="q-input"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="••••••"
            />
          </div>
        )}
        <button
          className="q-btn q-btn-primary w-full justify-center"
          disabled={busy}
          onClick={() => void submit()}
        >
          {mode === "login" ? (
            <LogIn className="size-4" />
          ) : mode === "signup" ? (
            <UserPlus className="size-4" />
          ) : (
            <KeyRound className="size-4" />
          )}
          {mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}
        </button>
        {mode === "login" && (
          <button
            className="w-full text-center text-xs text-muted-foreground underline"
            onClick={() => setMode("forgot")}
          >
            Esqueci minha senha
          </button>
        )}
        <button
          className="w-full text-center text-xs text-muted-foreground underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login"
            ? "Não tem conta? Criar agora"
            : mode === "signup"
              ? "Já tem conta? Entrar"
              : "Voltar para entrar"}
        </button>
      </section>
    </main>
  );
}
