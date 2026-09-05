import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPPORT_WHATSAPP } from "@/lib/qjuros/billing";

export type AccountStatus = "pending" | "approved" | "blocked";

/** Conta principal: nunca precisa de aprovação nem de assinatura. */
export const ADMIN_EMAIL = "sabinoclaudevann@gmail.com";

const CACHE_KEY = "qjuros_account_v1";

interface CachedAccount {
  userId: string;
  status: AccountStatus | null;
  isAdmin: boolean;
  trialEndsAt: string | null;
  subscriptionUntil: string | null;
  plan: string | null;
  supportWhatsApp: string;
}

function readCache(userId: string): CachedAccount | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAccount;
    return parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache(value: CachedAccount) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* ignora */
  }
}

export interface AccountInfo {
  status: AccountStatus | null;
  isAdmin: boolean;
  loading: boolean;
  /** Fim do período de teste grátis (ISO) */
  trialEndsAt: string | null;
  /** Validade da assinatura paga (ISO) */
  subscriptionUntil: string | null;
  plan: string | null;
  /** Número de WhatsApp usado nos links de assinatura (próprio ou padrão) */
  supportWhatsApp: string;
  /** true quando a conta está aprovada e dentro do teste ou da assinatura */
  hasAccess: boolean;
  /** true quando o acesso atual vem do teste grátis */
  inTrial: boolean;
  /** ISO da data em que o acesso expira (assinatura ou teste) */
  accessUntil: string | null;
  refresh: () => Promise<void>;
}

/** Lê o perfil (aprovação + assinatura) e o papel do usuário logado. */
export function useAccount(userId: string | null, email?: string | null): AccountInfo {
  const isMainAdmin = (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;

  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [subscriptionUntil, setSubscriptionUntil] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [supportWhatsApp, setSupportWhatsApp] = useState(SUPPORT_WHATSAPP);
  const [loading, setLoading] = useState(true);

  const applyCache = useCallback((c: CachedAccount) => {
    setStatus(c.status);
    setIsAdmin(c.isAdmin);
    setTrialEndsAt(c.trialEndsAt);
    setSubscriptionUntil(c.subscriptionUntil);
    setPlan(c.plan);
    setSupportWhatsApp(c.supportWhatsApp || SUPPORT_WHATSAPP);
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setStatus(null);
      setIsAdmin(false);
      setTrialEndsAt(null);
      setSubscriptionUntil(null);
      setPlan(null);
      setSupportWhatsApp(SUPPORT_WHATSAPP);
      setLoading(false);
      return;
    }

    // 1) Usa imediatamente o que já foi visto antes (funciona sem internet)
    const cached = readCache(userId);
    if (cached) applyCache(cached);
    else if (isMainAdmin) {
      setStatus("approved");
      setIsAdmin(true);
    }
    setLoading(!cached && !isMainAdmin);

    // 2) Sem internet: mantém o estado conhecido, não volta para "pendente"
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("status, trial_ends_at, subscription_until, plan, support_whatsapp")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);

    // Falha de rede/servidor: preserva o último estado conhecido
    if (profileError || rolesError) {
      setLoading(false);
      return;
    }

    const next: CachedAccount = {
      userId,
      status: isMainAdmin ? "approved" : ((profile?.status as AccountStatus | undefined) ?? "pending"),
      isAdmin: isMainAdmin || !!roles?.some((r) => r.role === "admin"),
      trialEndsAt: (profile?.trial_ends_at as string | null) ?? null,
      subscriptionUntil: (profile?.subscription_until as string | null) ?? null,
      plan: (profile?.plan as string | null) ?? null,
      supportWhatsApp: (profile?.support_whatsapp as string | null) ?? SUPPORT_WHATSAPP,
    };
    applyCache(next);
    writeCache(next);
    setLoading(false);
  }, [userId, isMainAdmin, applyCache]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onOnline = () => void load();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [load]);

  const now = Date.now();
  const subMs = subscriptionUntil ? new Date(subscriptionUntil).getTime() : 0;
  const trialMs = trialEndsAt ? new Date(trialEndsAt).getTime() : 0;
  const bestMs = Math.max(subMs, trialMs);
  const adminAccess = isMainAdmin || isAdmin;
  const hasAccess = adminAccess || (status === "approved" && bestMs > now);
  const inTrial = !adminAccess && subMs <= now && trialMs > now;

  return {
    status: isMainAdmin ? "approved" : status,
    isAdmin: adminAccess,
    loading,
    trialEndsAt,
    subscriptionUntil,
    plan,
    supportWhatsApp,
    hasAccess,
    inTrial,
    accessUntil: bestMs > 0 ? new Date(bestMs).toISOString() : null,
    refresh: load,
  };
}
