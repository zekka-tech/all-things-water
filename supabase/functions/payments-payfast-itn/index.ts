import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/auth.ts";
import {
  sendOrderConfirmation,
  sendMerchantNotification,
} from "../_shared/resend.ts";
import {
  getParam,
  getValidationUrl,
  parseFormParams,
  verifySignature,
} from "../_shared/payfast.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { alert, logInfo, logWarn, toErrorFields } from "../_shared/log.ts";
import { isAllowedPayfastIp } from "../_shared/payfast-ip.ts";
import { clientIp as getClientIp, isUuid } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  if (!isAllowedPayfastIp(req)) {
    logWarn("ITN rejected: source IP not in PayFast allowlist", {
      event: "payfast.itn.ip_rejected",
      fn: "payments-payfast-itn",
      ip: getClientIp(req),
    });
    return errorResponse("Forbidden", 403);
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkRateLimit(`payfast-itn:${clientIp}`);
  if (!rateLimit.allowed) {
    return errorResponse(
      "Too many requests. Please try again later.",
      429,
      { retryAfter: rateLimit.retryAfter },
    );
  }

  try {
    const text = await req.text();
    if (text.length > 16 * 1024) {
      return errorResponse("Payload too large", 413);
    }
    const formParams = parseFormParams(text);

    const sandbox = Deno.env.get("PAYFAST_SANDBOX") === "true";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") || "";
    if (!sandbox && !passphrase) {
      // Without a passphrase anyone can compute a valid signature.
      await alert("ITN rejected: PAYFAST_PASSPHRASE not configured in live mode", {
        event: "payfast.itn.misconfigured",
        fn: "payments-payfast-itn",
      });
      return errorResponse("Server misconfigured", 500);
    }

    const signature = getParam(formParams, "signature") || "";
    if (!verifySignature(formParams, signature, passphrase)) {
      await alert("ITN signature mismatch", {
        event: "payfast.itn.signature_mismatch",
        fn: "payments-payfast-itn",
        ip: clientIp,
        ref: getParam(formParams, "m_payment_id") || "",
      });
      return errorResponse("Invalid signature", 400);
    }

    // The ITN must be addressed to our merchant account.
    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") || "";
    if (!merchantId || getParam(formParams, "merchant_id") !== merchantId) {
      await alert("ITN merchant_id mismatch", {
        event: "payfast.itn.merchant_mismatch",
        fn: "payments-payfast-itn",
        ip: clientIp,
        ref: getParam(formParams, "m_payment_id") || "",
      });
      return errorResponse("Invalid merchant", 400);
    }

    const validateRes = await fetch(getValidationUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: text,
      signal: AbortSignal.timeout(10_000),
    });
    const validateText = await validateRes.text();

    if (validateText.trim() !== "VALID") {
      logWarn("PayFast server validation failed", {
        event: "payfast.itn.validation_failed",
        fn: "payments-payfast-itn",
        ref: getParam(formParams, "m_payment_id") || "",
        response: validateText.slice(0, 200),
      });
      return errorResponse("Payment validation failed", 400);
    }

    const paymentStatus = getParam(formParams, "payment_status");
    if (paymentStatus !== "COMPLETE") {
      logInfo("ITN received with non-COMPLETE status; ignoring", {
        event: "payfast.itn.ignored",
        fn: "payments-payfast-itn",
        ref: getParam(formParams, "m_payment_id") || "",
        paymentStatus,
      });
      return jsonResponse({ received: true });
    }

    const orderId = getParam(formParams, "m_payment_id");
    if (!isUuid(orderId)) {
      return errorResponse("Missing order reference", 400);
    }

    const supabase = serviceClient();

    const { data: order, error: fetchErr } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (fetchErr || !order) {
      logWarn("ITN for unknown order", {
        event: "payfast.itn.order_not_found",
        fn: "payments-payfast-itn",
        ref: orderId,
      });
      return errorResponse("Order not found", 404);
    }

    if (order.status === "paid") {
      return jsonResponse({ received: true });
    }

    const amountGross = Number(getParam(formParams, "amount_gross") || "NaN");
    if (!Number.isFinite(amountGross) || Math.abs(amountGross - Number(order.total)) > 0.01) {
      await alert("ITN amount mismatch — possible tampering", {
        event: "payfast.itn.amount_mismatch",
        fn: "payments-payfast-itn",
        ref: order.order_ref,
        expected: Number(order.total),
        got: amountGross,
      });
      return errorResponse("Amount mismatch", 400);
    }

    const pfPaymentId = getParam(formParams, "pf_payment_id") || "";

    const { data: result, error: markPaidErr } = await supabase.rpc("mark_order_paid", {
      p_order_id: orderId,
      p_payfast_payment_id: pfPaymentId,
      p_note: `Payment confirmed via PayFast (${pfPaymentId})`,
    });

    if (markPaidErr) {
      await alert("payment received but mark_order_paid RPC failed", {
        event: "payfast.itn.mark_paid_failed",
        fn: "payments-payfast-itn",
        ref: order.order_ref,
        pfPaymentId,
        ...toErrorFields(markPaidErr),
      });
      return errorResponse("Failed to update order", 500);
    }

    if (result?.error) {
      await alert("payment received but order needs manual review", {
        event: "payfast.itn.manual_review",
        fn: "payments-payfast-itn",
        ref: order.order_ref,
        pfPaymentId,
        detail: result,
      });
      return jsonResponse({ received: true, manualReview: true });
    }

    if (result?.alreadyPaid) {
      return jsonResponse({ received: true });
    }

    // Capture a card token from a tokenizing checkout (subscription_type=2) so
    // future auto-pay cycles can be charged ad-hoc. Best-effort; never blocks.
    const cardToken = getParam(formParams, "token");
    if (cardToken && order.user_id) {
      const { error: tokenErr } = await supabase.rpc("store_payment_token", {
        p_user_id: order.user_id,
        p_token: cardToken,
        p_last_four: null,
      });
      if (tokenErr) {
        logWarn("failed to store payment token", {
          event: "payfast.itn.token_store_failed",
          fn: "payments-payfast-itn",
          ref: order.order_ref,
          ...toErrorFields(tokenErr),
        });
      } else {
        logInfo("payment token stored", {
          event: "payfast.itn.token_stored",
          fn: "payments-payfast-itn",
          ref: order.order_ref,
        });
      }
    }

    const items = (order.order_items || []).map(
      (i: { product_name: string; quantity: number; product_price: number }) => ({
        name: i.product_name,
        qty: i.quantity,
        price: i.product_price,
      }),
    );

    await Promise.allSettled([
      sendOrderConfirmation(order.customer_email, order.order_ref, order.total, items),
      sendMerchantNotification(order.order_ref, order.customer_name, order.total, items),
    ]);

    logInfo("order marked as paid via ITN", {
      event: "payfast.itn.paid",
      fn: "payments-payfast-itn",
      ref: order.order_ref,
      pfPaymentId,
    });
    return jsonResponse({ received: true });
  } catch (err) {
    await alert("unhandled ITN handler error", {
      event: "payfast.itn.exception",
      fn: "payments-payfast-itn",
      ...toErrorFields(err),
    });
    return errorResponse("Internal server error", 500);
  }
});
