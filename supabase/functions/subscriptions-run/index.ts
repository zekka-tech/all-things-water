import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { buildSignedQuery, getProcessUrl } from "../_shared/payfast.ts";
import {
  buildSubscriptionPayParams,
  type PayLinkOrder,
} from "../_shared/subscription.ts";
import { chargeAdhoc } from "../_shared/payfast-api.ts";
import { sendOrderConfirmation, sendSubscriptionReorder } from "../_shared/resend.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";

/** A created order as returned by the process_due_subscriptions RPC. */
interface ProcessedSubscription {
  subscriptionId: string;
  orderId?: string;
  orderRef?: string;
  email: string;
  total?: number;
  nextDeliveryDate?: string;
  autoPay?: boolean;
  userId?: string | null;
  skipped: boolean;
  reason?: string;
  productId?: string;
}

interface SubOrder {
  id: string;
  order_ref: string;
  total: number;
  customer_name: string;
  customer_email: string;
  checkout_token: string;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // Shared-secret auth: this endpoint is invoked by a trusted scheduler only.
  const cronSecret = Deno.env.get("SUBSCRIPTION_CRON_SECRET");
  const authHeader = req.headers.get("Authorization") || "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID");
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY");
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL");
    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";

    if (!supabaseUrl || !serviceRoleKey) {
      return errorResponse("Supabase server configuration is incomplete", 500);
    }
    if (!merchantId || !merchantKey) {
      return errorResponse("PayFast merchant configuration is incomplete", 500);
    }
    if (!siteUrl || siteUrl.includes("localhost")) {
      return errorResponse("PUBLIC_SITE_URL must be configured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.rpc("process_due_subscriptions", {
      p_limit: 50,
    });

    if (error) {
      await alert("process_due_subscriptions RPC failed", {
        event: "subscription.run.rpc_failed",
        fn: "subscriptions-run",
        ...toErrorFields(error),
      });
      return errorResponse("Failed to process subscriptions", 500, undefined, req);
    }

    const processed: ProcessedSubscription[] = Array.isArray(data) ? data : [];
    const created = processed.filter((p) => !p.skipped && p.orderId);
    const skipped = processed.filter((p) => p.skipped);

    let emailed = 0;
    let charged = 0;
    const failures: string[] = [];

    // Email a (optionally tokenizing) one-click pay link for an order.
    const emailPayLink = async (order: SubOrder, tokenize: boolean) => {
      const params = buildSubscriptionPayParams(
        order as PayLinkOrder,
        { merchantId, merchantKey, siteUrl, functionBaseUrl: supabaseUrl },
        { tokenize },
      );
      const payUrl = `${getProcessUrl()}?${buildSignedQuery(params, passphrase)}`;
      await sendSubscriptionReorder(order.customer_email, order.order_ref, order.total, payUrl);
      emailed++;
    };

    for (const item of created) {
      try {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select("id, order_ref, total, customer_name, customer_email, checkout_token")
          .eq("id", item.orderId!)
          .single();

        if (orderErr || !order) {
          failures.push(item.subscriptionId);
          await alert("subscription order lookup failed", {
            event: "subscription.run.order_lookup_failed",
            fn: "subscriptions-run",
            ref: item.orderRef,
            subscriptionId: item.subscriptionId,
            ...toErrorFields(orderErr),
          });
          continue;
        }

        const o = order as SubOrder;

        // Non-auto-pay subscriptions just get a normal pay link.
        if (!item.autoPay || !item.userId) {
          await emailPayLink(o, false);
          continue;
        }

        // Auto-pay: charge the stored card token if we have one.
        const { data: tokenRow } = await supabase
          .from("payment_tokens")
          .select("token")
          .eq("user_id", item.userId)
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!tokenRow?.token) {
          // No token yet — send a TOKENIZING pay link so the first paid cycle
          // captures a token; subsequent cycles bill automatically.
          await emailPayLink(o, true);
          continue;
        }

        const result = await chargeAdhoc(
          tokenRow.token,
          o.total,
          `All Things Water — Standing order #${o.order_ref}`,
          o.id,
          { merchantId, passphrase, sandbox },
        );

        if (!result.ok) {
          // Charge failed (e.g. expired card) — fall back to a tokenizing link
          // and alert so ops can follow up.
          await alert("ad-hoc subscription charge failed; sent pay link", {
            event: "subscription.run.adhoc_failed",
            fn: "subscriptions-run",
            ref: o.order_ref,
            subscriptionId: item.subscriptionId,
            status: result.status,
          });
          await emailPayLink(o, true);
          continue;
        }

        // Charge succeeded — mark the order paid and send the confirmation
        // (the ad-hoc path does not rely on an ITN callback).
        const { data: markResult, error: markErr } = await supabase.rpc("mark_order_paid", {
          p_order_id: o.id,
          p_payfast_payment_id: result.pfPaymentId || "adhoc",
          p_note: "Auto-pay charge via PayFast ad-hoc token",
        });
        if (markErr || (markResult && markResult.error)) {
          failures.push(item.subscriptionId);
          await alert("auto-pay charged but mark_order_paid failed", {
            event: "subscription.run.adhoc_mark_failed",
            fn: "subscriptions-run",
            ref: o.order_ref,
            subscriptionId: item.subscriptionId,
            ...toErrorFields(markErr ?? markResult),
          });
          continue;
        }
        await sendOrderConfirmation(o.customer_email, o.order_ref, o.total, []);
        charged++;
      } catch (err) {
        failures.push(item.subscriptionId);
        await alert("subscription processing failed", {
          event: "subscription.run.item_failed",
          fn: "subscriptions-run",
          ref: item.orderRef,
          subscriptionId: item.subscriptionId,
          ...toErrorFields(err),
        });
      }
    }

    logInfo("subscriptions processed", {
      event: "subscription.run.ok",
      fn: "subscriptions-run",
      created: created.length,
      skipped: skipped.length,
      charged,
      emailed,
      failures: failures.length,
    });

    return jsonResponse(
      {
        created: created.length,
        skipped: skipped.length,
        charged,
        emailed,
        failures: failures.length,
      },
      200,
      req,
    );
  } catch (err) {
    await alert("unhandled subscriptions-run error", {
      event: "subscription.run.exception",
      fn: "subscriptions-run",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500, undefined, req);
  }
});
