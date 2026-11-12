import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { XCircle, ArrowLeft, ShoppingBag, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { env } from "@/lib/env";
import { apiPost } from "@/lib/api";
import { getSensitiveParam } from "@/lib/sensitiveParams";

type ReleaseState = "idle" | "releasing" | "released" | "error";

export function CheckoutCancel() {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId");
  // Stripped from the URL at startup (see sensitiveParams.ts).
  const token = getSensitiveParam("token") ?? searchParams.get("token");
  const orderRef = searchParams.get("orderRef");
  const canRelease = Boolean(orderId && token && env.supabaseUrl);

  // When there's an order to release, we start in "releasing" (the effect
  // below fires the request on mount).
  const [releaseState, setReleaseState] = useState<ReleaseState>(
    canRelease ? "releasing" : "idle",
  );

  useEffect(() => {
    if (!orderId || !token || !env.supabaseUrl) {
      return;
    }

    let active = true;

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
    idle: "Checkout was interrupted. Check your payment confirmation before trying again.",
    releasing:
      "We’re releasing your reserved stock now so you can retry checkout without waiting for the payment window to expire.",
    released:
      "The reserved stock has been released. If you completed a payment, contact us with your order reference before trying again.",
    error:
      "We couldn’t confirm the cancellation. Check your payment confirmation or contact us before trying again. Unpaid stock reservations expire automatically.",
  } as const;

  return (
    <>
      <Seo title="Checkout interrupted" description="Check the status of your interrupted checkout." noIndex />

      <div className="container-page flex flex-col items-center py-28 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-ink-100 dark:bg-ink-800">
          <XCircle className="h-10 w-10 text-ink-500 dark:text-ink-400" />
        </div>

        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          Checkout interrupted
        </h1>

        <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
          {statusCopy[releaseState]}
        </p>

        {orderRef && (
          <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
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
