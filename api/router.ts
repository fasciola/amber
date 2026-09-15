import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { subscribers } from "@db/schema";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),

  newsletter: createRouter({
    subscribe: publicQuery
      .input(z.object({ email: z.string().trim().email().max(320) }))
      .mutation(async ({ input }) => {
        const db = getDb();
        const email = input.email.toLowerCase();
        // Idempotent: re-subscribing the same address is a no-op success.
        await db
          .insert(subscribers)
          .values({ email })
          .onDuplicateKeyUpdate({ set: { email } });
        return { ok: true as const };
      }),
  }),
});

export type AppRouter = typeof appRouter;
