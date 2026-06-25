import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return errorResponse("Server configuration is incomplete", 500);
    }

    // Verify the caller's Supabase Auth JWT and confirm they are an admin.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!token) return errorResponse("Unauthorized", 401);

    const anon = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !userData.user) return errorResponse("Unauthorized", 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: adminRow } = await admin
      .from("admins")
      .select("user_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!adminRow) return errorResponse("Forbidden", 403);

    // Fetch recent orders with their items.
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 200);
    const statusFilter = url.searchParams.get("status");

    let query = admin
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (statusFilter && statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data: orders, error: ordersErr } = await query;

    if (ordersErr) {
      console.error("Fetch orders error:", ordersErr);
      return errorResponse("Failed to fetch orders", 500);
    }

    return jsonResponse({ orders: orders || [] });
  } catch (err) {
    console.error("Admin orders error:", err);
    return errorResponse("Internal server error", 500);
  }
});