interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

function buildOrderEmail(
  orderRef: string,
  total: number,
  items: OrderItem[],
): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${i.name} &times; ${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">R ${(i.price * i.qty).toFixed(2)}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2630">
  <h1 style="color:#06a3f0;margin:0 0 4px">All Things Water</h1>
  <p style="margin:0 0 24px;color:#66778f">Order Confirmation</p>
  <div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
    <p style="margin:0 0 8px;font-weight:600">${orderRef}</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="margin:16px 0 0;font-size:18px;font-weight:700;text-align:right">Total: R ${total.toFixed(2)}</p>
  </div>
  <p style="color:#66778f;font-size:14px">We'll notify you when your order ships. Questions? Reply to this email or WhatsApp us.</p>
</body>
</html>`;
}

export async function sendOrderConfirmation(
  email: string,
  orderRef: string,
  total: number,
  items: OrderItem[],
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping customer email");
    return;
  }

  try {
    const html = buildOrderEmail(orderRef, total, items);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: email,
        subject: `Order Confirmed \u2014 ${orderRef}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend customer email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend customer email error:", err);
  }
}

export async function sendMerchantNotification(
  orderRef: string,
  customerName: string,
  total: number,
  items: OrderItem[],
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping merchant notification");
    return;
  }

  const merchantEmail =
    Deno.env.get("MERCHANT_EMAIL") || "orders@allthingswater.co.za";

  try {
    const rows = items
      .map((i) => `${i.name} \u00d7 ${i.qty} \u2014 R ${(i.price * i.qty).toFixed(2)}`)
      .join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: merchantEmail,
        subject: `New Order \u2014 ${orderRef}`,
        text: `New order received!\n\n${orderRef}\nCustomer: ${customerName}\n\n${rows}\n\nTotal: R ${total.toFixed(2)}`,
      }),
    });

    if (!res.ok) {
      console.error("Resend merchant email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend merchant email error:", err);
  }
}

export interface BusinessQuote {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  teamSize?: string;
  interest?: string;
  message?: string;
}

/** Notify the sales inbox of a new B2B office-water quote request. */
export async function sendBusinessQuoteNotification(
  quote: BusinessQuote,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping B2B quote notification");
    return;
  }
  const to =
    Deno.env.get("SALES_EMAIL") ||
    Deno.env.get("MERCHANT_EMAIL") ||
    "orders@allthingswater.co.za";

  try {
    const lines = [
      `Company: ${quote.companyName}`,
      `Contact: ${quote.contactName}`,
      `Email: ${quote.email}`,
      quote.phone ? `Phone: ${quote.phone}` : "",
      quote.teamSize ? `Team size: ${quote.teamSize}` : "",
      quote.interest ? `Interested in: ${quote.interest}` : "",
      quote.message ? `\nMessage:\n${quote.message}` : "",
    ].filter(Boolean);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to,
        reply_to: quote.email,
        subject: `New B2B quote request — ${quote.companyName}`,
        text: `New office-water quote request\n\n${lines.join("\n")}`,
      }),
    });
    if (!res.ok) {
      console.error("Resend B2B notification failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend B2B notification error:", err);
  }
}

/** Acknowledge a B2B quote request to the requester. */
export async function sendBusinessQuoteAck(
  email: string,
  contactName: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  try {
    const body = `
<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
<p style="margin:0 0 12px">Hi ${contactName},</p>
<p style="margin:0 0 12px">Thanks for your interest in an All Things Water business account. We've received your request and a member of our team will be in touch within one business day with a tailored quote.</p>
<p style="margin:0">In the meantime, feel free to reply to this email with any questions.</p>
</div>`;
    const html = emailShell("We've received your request", body);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: email,
        subject: "Your All Things Water business enquiry",
        html,
      }),
    });
    if (!res.ok) {
      console.error("Resend B2B ack failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend B2B ack error:", err);
  }
}

/** Email a customer a one-click PayFast pay link for their due standing order. */
export async function sendSubscriptionReorder(
  email: string,
  orderRef: string,
  total: number,
  payUrl: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping subscription reorder email");
    return;
  }

  try {
    const body = `
<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
<p style="margin:0 0 8px;font-weight:600">Order ${orderRef}</p>
<p style="margin:0 0 16px">Your standing order is ready — we&rsquo;ve reserved your usual delivery. Tap below to pay and we&rsquo;ll get it on its way.</p>
<p style="margin:0 0 16px;font-size:18px;font-weight:700">Total: R ${total.toFixed(2)}</p>
<a href="${payUrl}" style="display:inline-block;background:#06a3f0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">Pay now</a>
<p style="margin:16px 0 0;color:#66778f;font-size:13px">This payment link holds your stock for a limited time. Manage or pause your subscription anytime from your account.</p>
</div>`;
    const html = emailShell("Your standing order is ready", body);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: email,
        subject: `Your standing order is ready — ${orderRef}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend subscription reorder email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend subscription reorder email error:", err);
  }
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2630">
<h1 style="color:#06a3f0;margin:0 0 4px">All Things Water</h1>
<p style="margin:0 0 24px;color:#66778f">${title}</p>
${bodyHtml}
<p style="color:#66778f;font-size:14px;margin-top:24px">Questions? Reply to this email or WhatsApp us.</p>
</body></html>`;
}

export async function sendShippingNotification(
  email: string,
  orderRef: string,
  trackingNote?: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping shipping email");
    return;
  }

  try {
    const body = `
<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
<p style="margin:0 0 8px;font-weight:600">Order ${orderRef}</p>
<p style="margin:0 0 16px">Good news — your order is on its way!</p>
${trackingNote ? `<p style="margin:0 0 16px;color:#66778f">${trackingNote}</p>` : ""}
<p style="margin:0">We&rsquo;ll let you know once it&rsquo;s been delivered.</p>
</div>`;
    const html = emailShell("Your order is on its way", body);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: email,
        subject: `Your order is on its way — ${orderRef}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend shipping email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend shipping email error:", err);
  }
}

export async function sendDeliveryNotification(
  email: string,
  orderRef: string,
): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set — skipping delivery email");
    return;
  }

  try {
    const body = `
<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">
<p style="margin:0 0 8px;font-weight:600">Order ${orderRef}</p>
<p style="margin:0 0 16px">Your order has been delivered. We hope you enjoy it!</p>
<p style="margin:0">If anything isn&rsquo;t right, just reply to this email and we&rsquo;ll make it right.</p>
</div>
<p style="color:#66778f;font-size:14px">Complete your experience — grab a refill or filter cartridge anytime.</p>`;
    const html = emailShell("Order delivered", body);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "All Things Water <orders@allthingswater.co.za>",
        to: email,
        subject: `Order delivered — ${orderRef}`,
        html,
      }),
    });

    if (!res.ok) {
      console.error("Resend delivery email failed:", await res.text());
    }
  } catch (err) {
    console.error("Resend delivery email error:", err);
  }
}
