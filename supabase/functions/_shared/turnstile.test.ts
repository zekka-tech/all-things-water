import { assertEquals } from "jsr:@std/assert";
import { turnstileConfigured, verifyTurnstile } from "./turnstile.ts";

Deno.test("not configured → verification is skipped (allows)", async () => {
  Deno.env.delete("TURNSTILE_SECRET_KEY");
  assertEquals(turnstileConfigured(), false);
  assertEquals(await verifyTurnstile(undefined), true);
  assertEquals(await verifyTurnstile("anything"), true);
});

Deno.test("configured but missing token → fails closed", async () => {
  Deno.env.set("TURNSTILE_SECRET_KEY", "secret");
  assertEquals(turnstileConfigured(), true);
  assertEquals(await verifyTurnstile(undefined), false);
  assertEquals(await verifyTurnstile(""), false);
  Deno.env.delete("TURNSTILE_SECRET_KEY");
});
