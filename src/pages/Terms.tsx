import { Scale, Shield, FileText, AlertTriangle, Gavel, Mail } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    icon: FileText,
    title: "1. Introduction",
    content: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the All Things Water
          website and the purchase of products through our online store. By accessing or using our
          website, you agree to be bound by these Terms. All Things Water is a South African
          e-commerce business specialising in bottled water, dispensers, chillers, water filters and
          accessories.
        </p>
        <p>
          If you do not agree with any part of these Terms, you must not use our website. These
          Terms constitute a binding agreement between you and All Things Water.
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    title: "2. Use of Site",
    content: (
      <>
        <p>
          You may use our website for lawful purposes only. You agree not to misuse, interfere with
          or attempt to gain unauthorised access to any part of the site. You must be at least 18
          years of age, or have the consent of a parent or legal guardian, to make a purchase.
        </p>
        <p>
          We reserve the right to modify, suspend or discontinue any aspect of the website at any
          time without prior notice. We may also restrict access to certain features or the entire
          site at our discretion.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "3. Product Information",
    content: (
      <>
        <p>
          We make every effort to display our products accurately, including descriptions, images
          and pricing. However, we do not warrant that product descriptions, images or other content
          on the site are error-free, complete or current. In the event of an error, we reserve the
          right to correct it and to amend your order accordingly.
        </p>
        <p>
          Bottled water is a consumable product and must be stored and handled in accordance with
          the instructions provided. Dispensers, chillers and water filters include manufacturer warranties as
          specified on the relevant product pages.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "4. Pricing & Payment",
    content: (
      <>
        <p>
          All prices listed on our website are in South African Rand (ZAR) and include VAT at the
          prevailing rate unless otherwise stated. Prices may change without prior notice, but the
          price applicable to your order will be the price displayed at the time you place your
          order.
        </p>
        <p>
          Payment is due at the time of order placement. We accept payments via the methods
          displayed at checkout. By providing payment details, you represent and warrant that you
          are authorised to use the chosen payment method.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "5. Delivery",
    content: (
      <>
        <p>
          We deliver to addresses within South Africa. Delivery timeframes are estimates and
          commence from the date of order confirmation. While we endeavour to meet all delivery
          estimates, we are not liable for delays caused by events outside our reasonable control.
        </p>
        <p>
          Orders above R500 qualify for free delivery. A delivery fee of R75 applies to orders
          below this threshold. Risk of loss and title for products pass to you upon delivery of the
          items to the specified delivery address.
        </p>
      </>
    ),
  },
  {
    icon: FileText,
    title: "6. Returns & Refunds",
    content: (
      <>
        <p>
          Our returns and refunds policy is governed by our{" "}
          <a href="/returns" className="text-brand-600 underline dark:text-brand-400">
            Returns &amp; Refunds
          </a>{" "}
          page, which forms part of these Terms. Returns are subject to the conditions set out in
          that policy and must comply with the requirements of the Consumer Protection Act 68 of
          2008 (&ldquo;CPA&rdquo;).
        </p>
      </>
    ),
  },
  {
    icon: Shield,
    title: "7. Intellectual Property",
    content: (
      <>
        <p>
          All content on this website &mdash; including text, graphics, logos, images, product
          descriptions and software &mdash; is the intellectual property of All Things Water or its
          licensors and is protected by South African copyright and trademark laws.
        </p>
        <p>
          You may not reproduce, distribute, modify, display or create derivative works from any
          content on this website without our prior written consent. The brand names &ldquo;All
          Things Water&rdquo; and associated logos are our trademarks.
        </p>
      </>
    ),
  },
  {
    icon: AlertTriangle,
    title: "8. Limitation of Liability",
    content: (
      <>
        <p>
          To the fullest extent permitted by South African law, All Things Water shall not be liable
          for any indirect, incidental, special or consequential damages arising out of or in
          connection with your use of our website or the products purchased, including but not
          limited to loss of profit, data or goodwill.
        </p>
        <p>
          Our total liability in respect of any claim arising from a product purchase shall be
          limited to the purchase price of the relevant product. Nothing in these Terms excludes or
          limits our liability for death or personal injury caused by our negligence, or for fraud,
          or for any liability that cannot be excluded under the CPA.
        </p>
      </>
    ),
  },
  {
    icon: Gavel,
    title: "9. Governing Law",
    content: (
      <>
        <p>
          These Terms shall be governed by and interpreted in accordance with the laws of the
          Republic of South Africa. Any dispute arising from these Terms or your use of the website
          shall be subject to the exclusive jurisdiction of the courts of South Africa.
        </p>
        <p>
          Consumers are entitled to the protections afforded under the Consumer Protection Act 68 of
          2008 (&ldquo;CPA&rdquo;), the Electronic Communications and Transactions Act 25 of 2002
          (&ldquo;ECTA&rdquo;) and the Protection of Personal Information Act 4 of 2013
          (&ldquo;POPIA&rdquo;).
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "10. Contact Information",
    content: (
      <>
        <p>
          For questions about these Terms, please contact us:
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

export function Terms() {
  return (
    <>
      <Seo
        title="Terms of Service"
        description="Terms and conditions for using the All Things Water website and purchasing products."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/15"
        />
        <div className="container-page relative max-w-2xl py-16 text-center lg:py-20">
          <span className="badge mx-auto bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Scale className="h-3.5 w-3.5" /> Legal
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
            Terms of{" "}
            <span className="gradient-text">Service</span>
          </h1>
          <p className="mt-3 text-sm text-ink-400 dark:text-ink-500">
            Last updated: June 2026
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Please read these Terms of Service carefully before using our website or placing an
            order. By using our services, you agree to these terms.
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
