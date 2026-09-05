import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/public/keep-alive")({
  server: {
    handlers: {
      GET: async () => {
        const supabase = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          {
            auth: {
              storage: undefined,
              persistSession: false,
              autoRefreshToken: false,
            },
          },
        );

        const startedAt = Date.now();
        const { error } = await supabase.rpc("keep_alive");
        const durationMs = Date.now() - startedAt;

        if (error) {
          console.error("[keep-alive] failed", error);
          return Response.json(
            { ok: false, error: error.message },
            { status: 500 },
          );
        }

        return Response.json({ ok: true, durationMs });
      },
    },
  },
});
