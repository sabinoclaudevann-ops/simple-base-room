import { createFileRoute } from "@tanstack/react-router";
import { buildPushPayload } from "@block65/webcrypto-web-push";

type Installment = {
  contractId: number;
  dueDate: string;
  total: number;
  paid?: boolean;
  deleted?: boolean;
};

function todayInFortaleza() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function brl(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function handle(request: Request) {
  const secret = process.env["PUSH_CRON_SECRET"];
  const provided =
    request.headers.get("x-cron-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const vapid = {
    subject: process.env["VAPID_SUBJECT"]!,
    publicKey: process.env["VAPID_PUBLIC_KEY"]!,
    privateKey: process.env["VAPID_PRIVATE_KEY"]!,
  };
  if (!vapid.publicKey || !vapid.privateKey) {
    return Response.json({ ok: false, error: "VAPID não configurado" }, { status: 500 });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const today = todayInFortaleza();

  const { data: subs, error: subsError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, last_sent_on");
  if (subsError) return Response.json({ ok: false, error: subsError.message }, { status: 500 });

  const pendingSubs = (subs ?? []).filter((s) => s.last_sent_on !== today);
  if (pendingSubs.length === 0) return Response.json({ ok: true, sent: 0, today });

  const userIds = [...new Set(pendingSubs.map((s) => s.user_id))];
  const { data: states } = await supabaseAdmin
    .from("app_state")
    .select("user_id, data")
    .in("user_id", userIds);

  const messageByUser = new Map<string, { title: string; body: string }>();
  for (const row of states ?? []) {
    const installments = ((row.data as { installments?: Installment[] } | null)?.installments ??
      []) as Installment[];
    const pending = installments.filter((i) => !i.paid && !i.deleted);
    const dueToday = pending.filter((i) => i.dueDate === today);
    const overdue = pending.filter((i) => i.dueDate < today);
    if (dueToday.length === 0 && overdue.length === 0) continue;

    const parts: string[] = [];
    if (dueToday.length)
      parts.push(
        `Vence hoje: ${dueToday.length} parcela(s) · ${brl(dueToday.reduce((s, i) => s + (i.total || 0), 0))}`,
      );
    if (overdue.length)
      parts.push(
        `Atrasadas: ${overdue.length} parcela(s) · ${brl(overdue.reduce((s, i) => s + (i.total || 0), 0))}`,
      );

    messageByUser.set(row.user_id, {
      title: "Q+Gestão · parcelas a receber",
      body: parts.join("\n"),
    });
  }

  let sent = 0;
  let removed = 0;

  for (const sub of pendingSubs) {
    const message = messageByUser.get(sub.user_id);
    if (!message) continue;
    try {
      const payload = await buildPushPayload(
        { data: JSON.stringify({ ...message, url: "/" }), options: { ttl: 60 * 60 * 12 } },
        {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        vapid,
      );
      const res = await fetch(
        sub.endpoint,
        payload as unknown as RequestInit,
      );
      if (res.status === 404 || res.status === 410) {
        await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
        removed += 1;
        continue;
      }
      if (res.ok) {
        sent += 1;
        await supabaseAdmin
          .from("push_subscriptions")
          .update({ last_sent_on: today })
          .eq("id", sub.id);
      } else {
        console.error("[push] envio falhou", res.status, await res.text());
      }
    } catch (error) {
      console.error("[push] erro ao enviar", error);
    }
  }

  return Response.json({ ok: true, sent, removed, today });
}

export const Route = createFileRoute("/api/public/send-due-push")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});
