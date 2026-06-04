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
