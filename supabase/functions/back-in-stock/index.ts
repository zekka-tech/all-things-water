import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  handleCors,
  errorResponse,
  jsonResponse,
} from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

interface SubscribeBody {
  email: string;
  productId: string;
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
  const rateLimit = checkRateLimit(`backinstock:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const body: SubscribeBody = await req.json();

    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return errorResponse("Valid email is required", 400);
    }
    if (!body.productId?.trim()) {
      return errorResponse("Product ID is required", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: product } = await supabase
      .from("products")
      .select("id, stock, name")
      .eq("id", body.productId.trim())
      .maybeSingle();

    if (!product) {
      return errorResponse("Product not found", 404);
    }
    if (product.stock > 0) {
      return jsonResponse({
        ok: true,
        subscribed: false,
        message: "This item is already in stock!",
      });
    }

    const { error: insertErr } = await supabase
      .from("back_in_stock_subscriptions")
      .upsert(
        { email: body.email.trim().toLowerCase(), product_id: body.productId.trim() },
        { onConflict: "email,product_id", ignoreDuplicates: true },
      );

    if (insertErr) {
      console.error("Back-in-stock insert error:", insertErr);
      return errorResponse("Failed to subscribe", 500);
    }

    return jsonResponse({ ok: true, subscribed: true }, 201);
  } catch (err) {
    console.error("Back-in-stock subscribe error:", err);
    return errorResponse("Internal server error", 500);
  }
});