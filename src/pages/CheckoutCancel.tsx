import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { XCircle, ArrowLeft, ShoppingBag, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { env } from "@/lib/env";
import { apiPost } from "@/lib/api";

type ReleaseState = "idle" | "releasing" | "released" | "error";

export function CheckoutCancel() {
  const [searchParams] = useSearchParams();
  const [releaseState, setReleaseState] = useState<ReleaseState>("idle");

  const orderId = searchParams.get("orderId");
  const token = searchParams.get("token");
  const orderRef = searchParams.get("orderRef");

  useEffect(() => {
    if (!orderId || !token || !env.supabaseUrl) {
      return;
    }

    let active = true;
    setReleaseState("releasing");

    void apiPost<{ ok: boolean }>(`${env.supabaseUrl}/functions/v1/order-cancel`, {
      orderId,
      token,
    })
      .then(() => {
        if (active) setReleaseState("released");
      })
      .catch(() => {
        if (active) setReleaseState("error");
      });

    return () => {
      active = false;
    };
  }, [orderId, token]);

  const statusCopy = {
    idle: "Your order has not been processed and you have not been charged.",
    releasing:
      "We’re releasing your reserved stock now so you can retry checkout without waiting for the payment window to expire.",
    released:
      "Your payment was cancelled, you have not been charged, and the reserved stock has been released.",
    error:
      "Your payment was cancelled and you have not been charged. If stock does not return immediately, the reservation will expire automatically shortly.",
  } as const;

  return (
    <>
      <Seo title="Payment cancelled" description="Your payment was cancelled and no charges were made." />

      <div className="container-page flex flex-col items-center py-28 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-ink-100 dark:bg-ink-800">
          <XCircle className="h-10 w-10 text-ink-400 dark:text-ink-500" />
        </div>

        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          Payment cancelled
        </h1>

        <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
          {statusCopy[releaseState]}
        </p>

        {orderRef && (
          <p className="mt-2 text-sm text-ink-400 dark:text-ink-500">
            Order reference: <span className="font-mono font-medium">{orderRef}</span>
          </p>
        )}

        {releaseState === "releasing" && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
            <Loader2 className="h-4 w-4 animate-spin" /> Releasing reservation
          </p>
        )}

        {releaseState === "released" && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Reservation released
          </p>
        )}

        {releaseState === "error" && (
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Reservation release could not be confirmed automatically
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/checkout"
            className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base"
          >
            <ArrowLeft className="h-5 w-5" />
            Return to checkout
          </Link>
          <Link
            to="/shop"
            className="btn-outline inline-flex items-center gap-2 px-6 py-3 text-base"
          >
            <ShoppingBag className="h-5 w-5" />
            Continue shopping
          </Link>
        </div>
      </div>
    </>
  );
}
