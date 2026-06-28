import { createClient } from "jsr:@supabase/supabase-js@2";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { buildSignedQuery, getProcessUrl } from "../_shared/payfast.ts";
import {
  buildSubscriptionPayParams,
  type PayLinkOrder,
} from "../_shared/subscription.ts";
import { sendSubscriptionReorder } from "../_shared/resend.ts";
import { alert, logInfo, toErrorFields } from "../_shared/log.ts";

/** A created order as returned by the process_due_subscriptions RPC. */
interface ProcessedSubscription {
  subscriptionId: string;
  orderId?: string;
  orderRef?: string;
  email: string;
  total?: number;
  nextDeliveryDate?: string;
  skipped: boolean;
  reason?: string;
  productId?: string;
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
    const emailFailures: string[] = [];

    for (const item of created) {
      try {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .select(
            "id, order_ref, total, customer_name, customer_email, checkout_token",
          )
          .eq("id", item.orderId!)
          .single();

        if (orderErr || !order) {
          emailFailures.push(item.subscriptionId);
          await alert("subscription order lookup failed", {
            event: "subscription.run.order_lookup_failed",
            fn: "subscriptions-run",
            ref: item.orderRef,
            subscriptionId: item.subscriptionId,
            ...toErrorFields(orderErr),
          });
          continue;
        }

        const params = buildSubscriptionPayParams(order as PayLinkOrder, {
          merchantId,
          merchantKey,
          siteUrl,
          functionBaseUrl: supabaseUrl,
        });
        const payUrl = `${getProcessUrl()}?${buildSignedQuery(params, passphrase)}`;

        await sendSubscriptionReorder(
          order.customer_email,
          order.order_ref,
          order.total,
          payUrl,
        );
        emailed++;
      } catch (err) {
        emailFailures.push(item.subscriptionId);
        await alert("subscription reorder email failed", {
          event: "subscription.run.email_failed",
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
      emailed,
      emailFailures: emailFailures.length,
    });

    return jsonResponse(
      {
        created: created.length,
        skipped: skipped.length,
        emailed,
        emailFailures: emailFailures.length,
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
