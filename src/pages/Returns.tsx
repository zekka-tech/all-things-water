import { RotateCcw, ShieldCheck, PackageCheck, Wallet, AlertTriangle, RefreshCw, Mail } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    icon: ShieldCheck,
    title: "Our Guarantee",
    content: (
      <>
        <p>
          At All Things Water, we stand behind every product we sell. If you are not satisfied with
          your purchase, we are here to help. Our returns and refunds policy is designed to be fair
          and complies with the Consumer Protection Act 68 of 2008 (&ldquo;CPA&rdquo;).
        </p>
        <p>
          This policy applies to products purchased directly from our website. Different terms may
          apply to items purchased through third-party retailers.
        </p>
      </>
    ),
  },
  {
    icon: PackageCheck,
    title: "Return Eligibility",
    content: (
      <>
        <p>You may return a product if it meets one of the following criteria:</p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">
          <li>
            <strong>Durable equipment</strong> (dispensers, chillers, water filters, accessories): Must be unused,
            in original packaging and returned within 14 days of delivery.
          </li>
          <li>
            <strong>Defective products:</strong> Items that are damaged, faulty or not as described
            on delivery may be returned within 6 months, as per CPA provisions.
          </li>
          <li>
            <strong>Incorrect items:</strong> If you received the wrong product, we will arrange a
            return and replacement at no cost to you.
          </li>
        </ul>
        <p>
          <strong>Please note:</strong> For health and safety reasons, sealed bottled water cannot
          be returned once the tamper-evident seal has been broken, unless the product is defective.
        </p>
      </>
    ),
  },
  {
    icon: RotateCcw,
    title: "Return Process",
    content: (
      <>
        <p>To initiate a return, please follow these steps:</p>
        <ol className="mt-2 space-y-1.5 text-sm list-decimal pl-5">
          <li>
            Contact us at{" "}
            <span className="text-brand-600 dark:text-brand-400">hello@allthingswater.co.za</span>{" "}
            within the applicable return window, providing your order number and reason for return.
          </li>
          <li>
            Our team will review your request and provide a return authorisation and shipping
            instructions within 2 business days.
          </li>
          <li>
            Pack the item securely in its original packaging with all accessories and manuals.
          </li>
          <li>
            Ship the item to the address provided in the return authorisation. We recommend using a
            trackable shipping method.
          </li>
        </ol>
      </>
    ),
  },
  {
    icon: Wallet,
    title: "Refund Policy",
    content: (
      <>
        <p>
          Once we receive and inspect your returned item, we will notify you of the outcome. If the
          return is approved, your refund will be processed as follows:
        </p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">
          <li>Refunds are issued to the original payment method used for the purchase.</li>
          <li>Refunds are typically processed within 7 business days of return approval.</li>
          <li>
            For change-of-mind returns on durable equipment, the original shipping cost is
            non-refundable and return shipping is at your expense.
          </li>
          <li>
            For defective or incorrect items, we cover all shipping costs and issue a full refund or
            replacement at your choice.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    title: "Damaged Items",
    content: (
      <>
        <p>
          If your order arrives damaged, please contact us within 48 hours of delivery. Provide
          photos of the damaged item and packaging, along with your order number. We will arrange a
          replacement or full refund, including all shipping costs, at no charge to you.
        </p>
        <p>
          We take great care in packaging our products, and we work with reliable courier partners
          to ensure your order arrives in perfect condition.
        </p>
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "Exchanges",
    content: (
      <>
        <p>
          We offer exchanges on durable equipment (dispensers, chillers, water filters, accessories) within 14 days
          of delivery, provided the item is unused and in original packaging. Exchanges are subject
          to product availability.
        </p>
        <p>
          For bottled water, exchanges are only available where the product delivered is incorrect or
          defective. If you received the wrong water product, we will deliver the correct product at
          no additional charge.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "Contact",
    content: (
      <>
        <p>
          For any questions about returns, refunds or exchanges, our support team is ready to help:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-600 dark:text-ink-400">
          <li>Email: hello@allthingswater.co.za</li>
          <li>Phone: +27 76 964 1460</li>
          <li>Address: South Africa</li>
        </ul>
      </>
    ),
  },
];

export function Returns() {
  return (
    <>
      <Seo
        title="Returns & Refunds"
        description="Our returns and refunds policy for bottled water, water dispensers, chillers, water filters and accessories."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/15"
        />
        <div className="container-page relative max-w-2xl py-16 text-center lg:py-20">
          <span className="badge mx-auto bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <RotateCcw className="h-3.5 w-3.5" /> Customer Care
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
            Returns &amp;{" "}
            <span className="gradient-text">Refunds</span>
          </h1>
          <p className="mt-3 text-sm text-ink-400 dark:text-ink-500">
            Last updated: June 2026
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            We want you to be happy with your purchase. If something is not right, we will make it
            right &mdash; quickly and fairly.
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="container-page max-w-3xl py-14">
        <div className="space-y-10">
          {sections.map((s) => (
            <div key={s.title}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <s.icon className="h-4.5 w-4.5" />
                </span>
                <h2 className="font-display text-xl font-bold text-ink-900 dark:text-white">
                  {s.title}
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-12 text-base leading-relaxed text-ink-600 dark:text-ink-300">
                {s.content}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
