import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { Seo } from "@/components/Seo";

export function CheckoutReturn() {
  return (
    <>
      <Seo title="Order confirmed" description="Your payment is being processed." />

      <div className="container-page flex flex-col items-center py-28 text-center">
        <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
          <ShoppingBag className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">
          Payment being processed
        </h1>

        <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
          Your payment is being confirmed. You&rsquo;ll receive a confirmation
          email shortly with your order details.
        </p>

        <p className="mt-2 max-w-md text-sm text-ink-400 dark:text-ink-500">
          If you don&rsquo;t hear from us within 30 minutes, please{" "}
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
