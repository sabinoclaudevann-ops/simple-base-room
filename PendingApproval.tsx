import { Hourglass, LogOut, RefreshCw, ShieldX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  email?: string | undefined;
  blocked?: boolean | undefined;
  onRefresh: () => void;
}

export function PendingApproval({ email, blocked, onRefresh }: Props) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <section className="q-card space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
          {blocked ? <ShieldX className="size-7" /> : <Hourglass className="size-7" />}
        </div>
        <h1 className="text-lg font-bold tracking-tight">
          {blocked ? "Acesso bloqueado" : "Conta aguardando autorização"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {blocked
            ? "Esta conta foi bloqueada pelo administrador do app."
            : "Sua conta foi criada, mas o administrador precisa autorizar o acesso antes de você usar o app."}
        </p>
        {email && <p className="text-xs text-muted-foreground">{email}</p>}
        <div className="flex gap-2">
          <button className="q-btn q-btn-ghost flex-1 justify-center" onClick={onRefresh}>
            <RefreshCw className="size-3.5" /> Verificar
          </button>
          <button
            className="q-btn q-btn-primary flex-1 justify-center"
            onClick={() => void supabase.auth.signOut()}
          >
            <LogOut className="size-3.5" /> Sair
          </button>
        </div>
      </section>
    </main>
  );
}
