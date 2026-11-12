import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ShoppingBag } from "lucide-react";
import { Seo } from "@/components/Seo";
import { useCart } from "@/context/CartContext";
import { apiPost } from "@/lib/api";
import { env } from "@/lib/env";
import { clearCheckoutSession, getCheckoutSession } from "@/lib/checkoutSession";
import { trackMarketing } from "@/lib/marketing";

export function CheckoutReturn() {
  const [searchParams] = useSearchParams();
  const orderRef = searchParams.get("orderRef");
  const { clear } = useCart();
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const session = getCheckoutSession(orderRef);
    if (!session || !env.supabaseUrl) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const check = async () => {
      try {
        const result = await apiPost<{ status: string; orderRef: string; total: number }>(
          `${env.supabaseUrl}/functions/v1/payments-payfast-initiate`,
          { action: "status", orderId: session.orderId, token: session.checkoutToken },
        );
        if (!active) return;
        if (["paid", "processing", "shipped", "delivered"].includes(result.status) && result.orderRef === orderRef) {
          setConfirmed(true);
          clearCheckoutSession();
          clear();
          trackMarketing({ type: "purchase", orderRef: result.orderRef, value: result.total });
          return;
        }
      } catch { /* the callback may still be in flight; leave the cart intact */ }
      if (active && ++attempts < 12) timer = setTimeout(() => { void check(); }, 10_000);
    };
    void check();
    return () => { active = false; clearTimeout(timer); };
  }, [orderRef, clear]);

  return (
    <>
      <Seo title={confirmed ? "Payment confirmed" : "Payment being processed"} description="Check your payment confirmation." noIndex />

      <div className="container-page flex flex-col items-center py-28 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <ShoppingBag className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          {confirmed ? "Payment confirmed" : "Payment being processed"}
        </h1>

        <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
          {confirmed ? "Your payment is confirmed. Thank you for your order." : "Your payment is being confirmed. You’ll receive a confirmation email once payment is verified."}
        </p>

        {orderRef && (
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
            Order reference: <span className="font-mono font-medium">{orderRef}</span>
          </p>
        )}

        <p className="mt-2 max-w-md text-sm text-ink-500 dark:text-ink-400">
          If you don’t hear from us within 30 minutes, please {" "}
          <Link
            to="/contact"
            className="font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            contact us
          </Link>{" "}
          with your order reference.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/shop" className="btn-primary px-6 py-3 text-base">
            Continue shopping
          </Link>
          <Link to="/contact" className="btn-outline px-6 py-3 text-base">
            Contact us
          </Link>
        </div>
      </div>
    </>
  );
}
