import { Link } from "react-router-dom";
import { XCircle, ArrowLeft, ShoppingBag } from "lucide-react";
import { Seo } from "@/components/Seo";

export function CheckoutCancel() {
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
          Your order has not been processed and you have not been charged.
        </p>

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
