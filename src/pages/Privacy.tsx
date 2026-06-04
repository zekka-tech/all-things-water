import { Shield, FileText, Eye, Database, Lock, Cookie, Server, UserCheck, Baby, RefreshCw, Mail } from "lucide-react";
import { Seo } from "@/components/Seo";

const sections = [
  {
    icon: FileText,
    title: "1. Introduction",
    content: (
      <>
        <p>
          At All Things Water, your privacy matters. This Privacy Policy explains how we collect,
          use, disclose and safeguard your personal information when you visit our website or make a
          purchase. We are committed to complying with the Protection of Personal Information Act 4
          of 2013 (&ldquo;POPIA&rdquo;).
        </p>
        <p>
          By using our website, you consent to the data practices described in this policy. The
          term &ldquo;personal information&rdquo; has the meaning given to it in POPIA.
        </p>
      </>
    ),
  },
  {
    icon: Eye,
    title: "2. Information We Collect",
    content: (
      <>
        <p>We may collect the following categories of personal information:</p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">
          <li>
            <strong>Identity &amp; contact information:</strong> your name, email address, phone
            number, billing and delivery address.
          </li>
          <li>
            <strong>Transaction information:</strong> details of products you have purchased,
            payment method (we do not store full card numbers) and order history.
          </li>
          <li>
            <strong>Technical information:</strong> IP address, browser type, device information
            and usage data collected automatically when you browse our site.
          </li>
        </ul>
      </>
    ),
  },
  {
    icon: Database,
    title: "3. How We Use Information",
    content: (
      <>
        <p>We use your personal information for the following purposes:</p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">
          <li>To process and fulfil your orders, including delivery and payment processing.</li>
          <li>To communicate with you about your orders, account and customer support inquiries.</li>
          <li>To improve our website, products and customer experience.</li>
          <li>To send promotional communications, only with your consent (you may opt out at any time).</li>
          <li>To comply with legal obligations and enforce our Terms of Service.</li>
        </ul>
      </>
    ),
  },
  {
    icon: Lock,
    title: "4. Your Rights Under POPIA",
    content: (
      <>
        <p>
          As a South African data subject, you have the following rights under POPIA:
        </p>
        <ul className="mt-2 space-y-1.5 text-sm list-disc pl-5">
          <li>
            <strong>Right of access:</strong> You may request a copy of the personal information we
            hold about you.
          </li>
          <li>
            <strong>Right to correction:</strong> You may request that we correct or update
            inaccurate or incomplete personal information we hold about you.
          </li>
          <li>
            <strong>Right to object:</strong> You may object to the processing of your personal
            information for direct marketing purposes.
          </li>
          <li>
            <strong>Right to deletion:</strong> You may request the deletion or destruction of
            your personal information where permitted by law.
          </li>
          <li>
            <strong>Right to complain:</strong> You may lodge a complaint with the Information
            Regulator (South Africa) if you believe we have not complied with POPIA.
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <span className="text-brand-600 dark:text-brand-400">hello@allthingswater.co.za</span>.
        </p>
      </>
    ),
  },
  {
    icon: Cookie,
    title: "5. Cookies",
    content: (
      <>
        <p>
          We use cookies and similar tracking technologies to enhance your browsing experience,
          analyse website traffic and remember your preferences. Cookies are small text files stored
          on your device by your browser.
        </p>
        <p>
          We use essential cookies required for the operation of the website (e.g. shopping cart and
          session management) and analytics cookies to understand how visitors use our site. You may
          disable cookies in your browser settings, but this may affect the functionality of our
          website.
        </p>
      </>
    ),
  },
  {
    icon: Server,
    title: "6. Data Security",
    content: (
      <>
        <p>
          We implement appropriate technical and organisational measures to protect your personal
          information against unauthorised access, alteration, disclosure or destruction. These
          measures include encryption, access controls and secure server infrastructure.
        </p>
        <p>
          While we strive to protect your personal information, no method of transmission over the
          internet or electronic storage is 100% secure. We cannot guarantee absolute security, but
          we take all reasonable steps in line with POPIA standards.
        </p>
      </>
    ),
  },
  {
    icon: UserCheck,
    title: "7. Third-Party Services",
    content: (
      <>
        <p>
          We may share your personal information with trusted third-party service providers who
          assist us in operating our website, processing payments and delivering orders. These
          providers are contractually bound to protect your information and may only use it for the
          purposes specified by us.
        </p>
        <p>
          Our website may contain links to third-party websites. We are not responsible for the
          privacy practices or content of those websites, and we encourage you to read their privacy
          policies.
        </p>
      </>
    ),
  },
  {
    icon: Baby,
    title: "8. Children&rsquo;s Privacy",
    content: (
      <>
        <p>
          Our website is not intended for children under the age of 18. We do not knowingly collect
          personal information from children. If you are a parent or guardian and believe your child
          has provided us with personal information, please contact us immediately and we will take
          steps to delete such information.
        </p>
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "9. Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or
          applicable laws. We will post the revised policy on this page and update the &ldquo;Last
          updated&rdquo; date. We encourage you to review this policy periodically.
        </p>
        <p>
          Material changes will be communicated to you via email where we have your contact details
          on file.
        </p>
      </>
    ),
  },
  {
    icon: Mail,
    title: "10. Contact",
    content: (
      <>
        <p>
          If you have any questions, concerns or wish to exercise your rights under this policy,
          please contact us:
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-600 dark:text-ink-400">
          <li>Email: hello@allthingswater.co.za</li>
          <li>Phone: +27 00 000 0000</li>
          <li>Address: South Africa</li>
        </ul>
        <p>
          You may also contact the Information Regulator (South Africa) at{" "}
          <span className="text-brand-600 dark:text-brand-400">inforeg@justice.gov.za</span>.
        </p>
      </>
    ),
  },
];

export function Privacy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="How All Things Water collects, uses and protects your personal information in compliance with POPIA."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/15"
        />
        <div className="container-page relative max-w-2xl py-16 text-center lg:py-20">
          <span className="badge mx-auto bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Shield className="h-3.5 w-3.5" /> Privacy
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
            Privacy{" "}
            <span className="gradient-text">Policy</span>
          </h1>
          <p className="mt-3 text-sm text-ink-400 dark:text-ink-500">
            Last updated: June 2026
          </p>
          <p className="mt-4 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            We take your privacy seriously. This policy explains how we handle your personal
            information in accordance with South Africa&rsquo;s POPIA legislation.
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
