/**
 * Transactional email via Resend.
 *
 * Every value interpolated into HTML goes through escapeHtml()/safeHref():
 * names, company names and notes are user-supplied, and these emails are sent
 * from our own domain — unescaped input would let anyone send phishing HTML
 * that looks like it came from us (e.g. a B2B "quote" to a victim's address).
 */
import { escapeHtml, safeHref } from "./http.ts";
import { logError, logWarn } from "./log.ts";
import { CONTACT_PHONE } from "./contact.ts";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

const RESEND_URL = "https://api.resend.com/emails";

function fromAddress(): string {
  return Deno.env.get("EMAIL_FROM") || "All Things Water <orders@allthingswater.co.za>";
}

/** Strip CR/LF so user text cannot break out of a header-like field. */
function oneLine(value: string, max = 200): string {
  return value.replace(/[\r\n]+/g, " ").slice(0, max);
}

const money = (n: number) => `R ${Number(n).toFixed(2)}`;

interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}

/** Send one email. Returns true on success; never throws. */
export async function sendEmail(msg: EmailMessage, tag: string): Promise<boolean> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    logWarn("RESEND_API_KEY not set; email skipped", { event: "email.skipped", tag });
    return false;
  }
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: msg.to,
        subject: oneLine(msg.subject),
        ...(msg.html ? { html: msg.html } : {}),
        ...(msg.text ? { text: msg.text } : {}),
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logError("Resend request failed", {
        event: "email.failed",
        tag,
        status: res.status,
        response: (await res.text()).slice(0, 300),
      });
      return false;
    }
    return true;
  } catch (err) {
    logError("Resend request error", { event: "email.error", tag, errMessage: String(err) });
    return false;
  }
}

/** Shared HTML layout. `bodyHtml` must already be escaped. */
export function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2630">
<h1 style="color:#06a3f0;margin:0 0 4px">All Things Water</h1>
<p style="margin:0 0 24px;color:#66778f">${escapeHtml(title)}</p>
${bodyHtml}
<p style="color:#66778f;font-size:14px;margin-top:24px">Questions? Reply to this email, or call or WhatsApp us on ${escapeHtml(CONTACT_PHONE)}.</p>
</body></html>`;
}

const card = (inner: string) =>
  `<div style="background:#f6f7f9;border-radius:12px;padding:20px;margin-bottom:24px">${inner}</div>`;

const button = (href: string, label: string) =>
  `<a href="${safeHref(href)}" style="display:inline-block;background:#06a3f0;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">${escapeHtml(label)}</a>`;

export function buildOrderEmail(orderRef: string, total: number, items: OrderItem[]): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(i.name)} &times; ${escapeHtml(i.qty)}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${money(i.price * i.qty)}</td></tr>`,
    )
    .join("");
  return emailShell(
    "Order Confirmation",
    card(
      `<p style="margin:0 0 8px;font-weight:600">${escapeHtml(orderRef)}</p>` +
        (rows ? `<table style="width:100%;border-collapse:collapse">${rows}</table>` : "") +
        `<p style="margin:16px 0 0;font-size:18px;font-weight:700;text-align:right">Total: ${money(total)}</p>`,
    ) +
      `<p style="color:#66778f;font-size:14px">We'll notify you when your order ships.</p>`,
  );
}

export async function sendOrderConfirmation(
  email: string,
  orderRef: string,
  total: number,
  items: OrderItem[],
): Promise<void> {
  await sendEmail(
    {
      to: email,
      subject: `Order Confirmed — ${orderRef}`,
      html: buildOrderEmail(orderRef, total, items),
    },
    "order_confirmation",
  );
}

export async function sendMerchantNotification(
  orderRef: string,
  customerName: string,
  total: number,
  items: OrderItem[],
): Promise<void> {
  const rows = items.map((i) => `${i.name} × ${i.qty} — ${money(i.price * i.qty)}`).join("\n");
  await sendEmail(
    {
      to: Deno.env.get("MERCHANT_EMAIL") || "orders@allthingswater.co.za",
      subject: `New Order — ${orderRef}`,
      text: `New order received!\n\n${orderRef}\nCustomer: ${customerName}\n\n${rows}\n\nTotal: ${money(total)}`,
    },
    "merchant_notification",
  );
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

/** Notify the sales inbox of a new B2B office-water quote request (plain text). */
export async function sendBusinessQuoteNotification(quote: BusinessQuote): Promise<void> {
  const lines = [
    `Company: ${quote.companyName}`,
    `Contact: ${quote.contactName}`,
    `Email: ${quote.email}`,
    quote.phone ? `Phone: ${quote.phone}` : "",
    quote.teamSize ? `Team size: ${quote.teamSize}` : "",
    quote.interest ? `Interested in: ${quote.interest}` : "",
    quote.message ? `\nMessage:\n${quote.message}` : "",
  ].filter(Boolean);

  await sendEmail(
    {
      to: Deno.env.get("SALES_EMAIL") || Deno.env.get("MERCHANT_EMAIL") || "orders@allthingswater.co.za",
      replyTo: quote.email,
      subject: `New B2B quote request — ${quote.companyName}`,
      text: `New office-water quote request\n\n${lines.join("\n")}`,
    },
    "b2b_notification",
  );
}

export function buildBusinessQuoteAck(contactName: string): string {
  return emailShell(
    "We've received your request",
    card(
      `<p style="margin:0 0 12px">Hi ${escapeHtml(contactName.slice(0, 100))},</p>` +
        `<p style="margin:0 0 12px">Thanks for your interest in an All Things Water business account. We've received your request and a member of our team will be in touch within one business day with a tailored quote.</p>` +
        `<p style="margin:0">In the meantime, feel free to reply to this email with any questions.</p>`,
    ),
  );
}

/** Acknowledge a B2B quote request to the requester. */
export async function sendBusinessQuoteAck(email: string, contactName: string): Promise<void> {
  await sendEmail(
    {
      to: email,
      subject: "Your All Things Water business enquiry",
      html: buildBusinessQuoteAck(contactName),
    },
    "b2b_ack",
  );
}

/** Email a customer a one-click PayFast pay link for their due standing order. */
export async function sendSubscriptionReorder(
  email: string,
  orderRef: string,
  total: number,
  payUrl: string,
): Promise<void> {
  const html = emailShell(
    "Your standing order is ready",
    card(
      `<p style="margin:0 0 8px;font-weight:600">Order ${escapeHtml(orderRef)}</p>` +
        `<p style="margin:0 0 16px">Your standing order is ready — we&rsquo;ve reserved your usual delivery. Tap below to pay and we&rsquo;ll get it on its way.</p>` +
        `<p style="margin:0 0 16px;font-size:18px;font-weight:700">Total: ${money(total)}</p>` +
        button(payUrl, "Pay now") +
        `<p style="margin:16px 0 0;color:#66778f;font-size:13px">This payment link holds your stock for a limited time. Manage or pause your subscription anytime from your account.</p>`,
    ),
  );
  await sendEmail(
    { to: email, subject: `Your standing order is ready — ${orderRef}`, html },
    "subscription_reorder",
  );
}

export async function sendShippingNotification(
  email: string,
  orderRef: string,
  trackingNote?: string,
): Promise<void> {
  const html = emailShell(
    "Your order is on its way",
    card(
      `<p style="margin:0 0 8px;font-weight:600">Order ${escapeHtml(orderRef)}</p>` +
        `<p style="margin:0 0 16px">Good news — your order is on its way!</p>` +
        (trackingNote
          ? `<p style="margin:0 0 16px;color:#66778f">${escapeHtml(trackingNote.slice(0, 1000))}</p>`
          : "") +
        `<p style="margin:0">We&rsquo;ll let you know once it&rsquo;s been delivered.</p>`,
    ),
  );
  await sendEmail(
    { to: email, subject: `Your order is on its way — ${orderRef}`, html },
    "shipping",
  );
}

export async function sendDeliveryNotification(email: string, orderRef: string): Promise<void> {
  const html = emailShell(
    "Order delivered",
    card(
      `<p style="margin:0 0 8px;font-weight:600">Order ${escapeHtml(orderRef)}</p>` +
        `<p style="margin:0 0 16px">Your order has been delivered. We hope you enjoy it!</p>` +
        `<p style="margin:0">If anything isn&rsquo;t right, just reply to this email and we&rsquo;ll make it right.</p>`,
    ) +
      `<p style="color:#66778f;font-size:14px">Complete your experience — grab a refill or filter cartridge anytime.</p>`,
  );
  await sendEmail({ to: email, subject: `Order delivered — ${orderRef}`, html }, "delivered");
}

export function buildBackInStockEmail(productName: string, productUrl: string): string {
  return emailShell(
    "Back in stock!",
    card(
      `<p style="font-size:18px;font-weight:600;margin:0 0 12px">${escapeHtml(productName)}</p>` +
        `<p style="margin:0 0 16px;color:#66778f">Good news — we&rsquo;ve restocked this item and it&rsquo;s ready to ship.</p>` +
        button(productUrl, "Shop now"),
    ) +
      `<p style="color:#66778f;font-size:14px">You&rsquo;re receiving this because you asked to be notified when this product returns to stock.</p>`,
  );
}

export async function sendBackInStock(
  email: string,
  productName: string,
  productUrl: string,
): Promise<boolean> {
  return await sendEmail(
    {
      to: email,
      subject: `Back in stock — ${productName}`,
      html: buildBackInStockEmail(productName, productUrl),
    },
    "back_in_stock",
  );
}
