import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface CancelRequest {
  orderId: string;
  token: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const clientIp =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const rateLimit = checkRateLimit(`order-cancel:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const { orderId, token }: CancelRequest = await req.json();

    if (!orderId?.trim() || !token?.trim()) {
      return errorResponse("orderId and token are required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("id, status, checkout_token")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      return errorResponse("Order not found", 404);
    }

    if (order.checkout_token !== token) {
      return errorResponse("Invalid cancellation token", 403);
    }

    const { data: result, error: releaseErr } = await supabase.rpc(
      "release_order_reservation",
      {
        p_order_id: orderId,
        p_target_status: "cancelled",
        p_note: "Payment cancelled by customer before checkout completion",
      },
    );

    if (releaseErr) {
      console.error("order-cancel release RPC error:", releaseErr);
      return errorResponse("Failed to cancel order", 500);
    }

    if (result?.error) {
      const status = result.status === "paid" ? 409 : 400;
      return errorResponse(String(result.error), status, result);
    }

    return jsonResponse({
      ok: true,
      released: Boolean(result?.released),
      status: result?.status ?? order.status,
    });
  } catch (err) {
    console.error("order-cancel error:", err);
    return errorResponse("Internal server error", 500);
  }
});
