import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultData, type AppData } from "./types";
import { clone } from "./logic";

const STORAGE_KEY = "qjuros_data_v1";
const META_KEY = "qjuros_meta_v1";

export type SyncState = "offline" | "syncing" | "pending" | "synced";

interface LocalMeta {
  updatedAt: string;
  dirty: boolean;
  userId: string | null;
}

function normalize(parsed: AppData): AppData {
  if (!parsed.trash) parsed.trash = { clients: [], contracts: [], installments: [] };
  if (!parsed.trash.clients) parsed.trash.clients = [];
  if (!parsed.trash.contracts) parsed.trash.contracts = [];
  if (!parsed.trash.installments) parsed.trash.installments = [];
  if (!parsed.clients) parsed.clients = [];
  if (!parsed.contracts) parsed.contracts = [];
  if (!parsed.installments) parsed.installments = [];
  if (!parsed.cashEntries) parsed.cashEntries = [];
  if (!parsed.nextId) parsed.nextId = 1;
  return parsed;
}

function readLocal(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw) as AppData) : null;
  } catch {
    return null;
  }
}

function readMeta(): LocalMeta {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (raw) return JSON.parse(raw) as LocalMeta;
  } catch {
    /* ignora */
  }
  return { updatedAt: new Date(0).toISOString(), dirty: false, userId: null };
}

function writeLocal(data: AppData, meta: LocalMeta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* armazenamento cheio/indisponível */
  }
}

function isEmpty(data: AppData) {
  return data.clients.length === 0 && data.contracts.length === 0;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useAppData(userId: string | null) {
  const [data, setData] = useState<AppData>(getDefaultData);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<SyncState>("synced");

  const latest = useRef<AppData>(getDefaultData());
  const meta = useRef<LocalMeta>({ updatedAt: new Date(0).toISOString(), dirty: false, userId: null });
  const pushing = useRef(false);

  const setSyncFromMeta = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) setSync("offline");
    else setSync(meta.current.dirty ? "pending" : "synced");
  }, []);

  /** Envia o estado local para a nuvem (fila de 1 item: sempre o snapshot mais recente). */
  const flush = useCallback(
    async (uid: string) => {
      if (pushing.current) return;
      if (!meta.current.dirty) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSync("offline");
        return;
      }
      pushing.current = true;
      setSync("syncing");
      const snapshotAt = meta.current.updatedAt;
      const { error } = await supabase.from("app_state").upsert({
        user_id: uid,
        data: latest.current as unknown as never,
        updated_at: snapshotAt,
      });
      pushing.current = false;
      if (error) {
        setSyncFromMeta();
        return;
      }
      // Só limpa "dirty" se nada novo foi editado durante o envio.
      if (meta.current.updatedAt === snapshotAt) {
        meta.current = { ...meta.current, dirty: false };
        writeLocal(latest.current, meta.current);
        setSyncFromMeta();
      } else {
        void flush(uid);
      }
    },
    [setSyncFromMeta],
  );

  // 1) Carrega imediatamente do dispositivo (funciona offline)
  useEffect(() => {
    const local = readLocal();
    const localMeta = readMeta();
    // Se o cache local pertence a OUTRA conta, começa do zero para o novo usuário.
    if (localMeta.userId && userId && localMeta.userId !== userId) {
      const fresh = getDefaultData();
      const freshMeta: LocalMeta = { updatedAt: new Date(0).toISOString(), dirty: false, userId };
      latest.current = fresh;
      meta.current = freshMeta;
      writeLocal(fresh, freshMeta);
      setData(fresh);
    } else if (local) {
      latest.current = local;
      meta.current = localMeta;
      setData(local);
    }
    setLoading(false);
    setSyncFromMeta();
  }, [userId, setSyncFromMeta]);


  // 2) Reconcilia com a nuvem e escuta mudanças do outro aparelho
  useEffect(() => {
    if (!userId) {
      setSyncFromMeta();
      return;
    }
    let cancelled = false;

    const pull = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setSync("offline");
        return;
      }
      setSync("syncing");
      const { data: row, error } = await supabase
        .from("app_state")
        .select("data, updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setSyncFromMeta();
        return;
      }

      const remoteAt = row?.updated_at ?? null;
      const remote = row?.data ? normalize(clone(row.data as unknown as AppData)) : null;
      const localAt = meta.current.updatedAt;

      const localIsNewer = meta.current.dirty && (!remoteAt || localAt > remoteAt);
      const localHasDataRemoteDoesnt = remote ? isEmpty(remote) && !isEmpty(latest.current) : !isEmpty(latest.current);

      if (localIsNewer || localHasDataRemoteDoesnt) {
        meta.current = { updatedAt: new Date().toISOString(), dirty: true, userId };
        writeLocal(latest.current, meta.current);
        await flush(userId);
        return;
      }

      if (remote && (!remoteAt || remoteAt >= localAt)) {
        latest.current = remote;
        meta.current = { updatedAt: remoteAt ?? new Date().toISOString(), dirty: false, userId };
        writeLocal(remote, meta.current);
        setData(remote);
      }
      setSyncFromMeta();
    };

    void pull();

    const channel = supabase
      .channel(`app_state_${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_state", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { data?: AppData; updated_at?: string } | null;
          if (!row?.data) return;
          // Alterações locais pendentes têm prioridade; serão enviadas em seguida.
          if (meta.current.dirty) return;
          const next = normalize(clone(row.data));
          if (JSON.stringify(next) === JSON.stringify(latest.current)) return;
          latest.current = next;
          meta.current = { updatedAt: row.updated_at ?? new Date().toISOString(), dirty: false, userId };
          writeLocal(next, meta.current);
          setData(next);
        },
      )
      .subscribe();

    const onOnline = () => {
      void (async () => {
        await flush(userId);
        await pull();
      })();
    };
    const onOffline = () => setSync("offline");
    const onVisible = () => {
      if (document.visibilityState === "visible") onOnline();
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);

    const interval = window.setInterval(() => {
      if (meta.current.dirty) void flush(userId);
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, flush, setSyncFromMeta]);

  const update = useCallback(
    (mutator: (draft: AppData) => void) => {
      setData((current) => {
        const draft = clone(current);
        mutator(draft);
        latest.current = draft;
        meta.current = { updatedAt: new Date().toISOString(), dirty: true, userId };
        writeLocal(draft, meta.current);
        if (userId) void flush(userId);
        else setSyncFromMeta();
        return draft;
      });
      setSyncFromMeta();
    },
    [userId, flush, setSyncFromMeta],
  );

  return { data, update, loading, sync };
}
