import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Phone, Send, CheckCircle2, MessageCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Turnstile } from "@/components/Turnstile";
import { turnstileEnabled } from "@/lib/turnstile";
import { cx } from "@/lib/format";
import { env } from "@/lib/env";
import { validateEmail, validatePhone } from "@/lib/validation";

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+27 76 964 1460" },
  { icon: Mail, label: "Email", value: "hello@allthingswater.co.za" },
  { icon: MapPin, label: "Location", value: "South Africa" },
];

/* ── Helpers ── */

function whatsappUrl(number: string, message: string): string {
  const body = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${body}`;
}

/* ── Component ── */

export function Contact() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!validateEmail(form.email)) next.email = "Enter a valid email address.";
    if (form.phone.trim() && !validatePhone(form.phone)) {
      next.phone = "Enter a valid SA number (e.g. 082 123 4567).";
    }
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) return;

    if (!env.contactFormEndpoint) {
      setSubmitError(
        "Contact form is currently unavailable. Please email us or reach out on WhatsApp instead.",
      );
      return;
    }

    if (turnstileEnabled() && !turnstileToken) {
      setSubmitError("Please complete the verification below.");
      return;
    }

    setSending(true);

    try {
      const res = await fetch(env.contactFormEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          message: form.message.trim(),
          turnstileToken: turnstileToken || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error("We couldn't send your message right now. Please try again later.");
      }

      setSent(true);
    } catch {
      setSubmitError("We couldn't send your message right now. Please try again later.");
    } finally {
      setSending(false);
    }
  };

  const whatsappMessage = "Hi All Things Water! I'd like to get in touch.";
  const waUrl = env.whatsappNumber
    ? whatsappUrl(env.whatsappNumber, whatsappMessage)
    : "";

  return (
    <>
      <Seo title="Contact" description="Get in touch with the All Things Water team." />

      <div className="container-page grid gap-12 py-14 lg:grid-cols-2">
        {/* Left — contact info */}
        <div>
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            Contact us
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Get in touch
          </h1>
          <p className="mt-3 max-w-sm leading-relaxed text-ink-600 dark:text-ink-300">
            Questions about an order, bulk pricing or a dispenser, chiller or water-filter setup? Send us a message and we'll get
            back to you within one business day.
          </p>

          <ul className="mt-8 space-y-4">
            {contactInfo.map(({ icon: Icon, label, value }) => (
              <li key={label} className="flex items-center gap-4">
                <div className="icon-wrap">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400 dark:text-ink-500">
                    {label}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-ink-700 dark:text-ink-200">
                    {value}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            to="/business"
            className="mt-10 block rounded-2xl bg-brand-50 p-5 transition-colors hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/30"
          >
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
              Bulk orders &amp; business accounts &rarr;
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Setting up a full office? We offer volume pricing and recurring delivery schedules.
              Request a tailored quote on our business page.
            </p>
          </Link>

          {/* WhatsApp CTA */}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline mt-6 w-full py-3 text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Send us a WhatsApp
            </a>
          )}
        </div>

        {/* Right — form */}
        <div className="card p-6">
          {/* ── Status feedback (aria-live) ── */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {sending && "Sending your message…"}
            {sent && "Message sent successfully!"}
            {submitError && `Error: ${submitError}`}
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-14 text-center animate-scale-in">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-ink-900 dark:text-white">
                Message sent!
              </h2>
              <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
                Thanks {form.name.split(" ")[0]} — we'll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              {/* ── Submission error banner ── */}
              {submitError && (
                <div
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 animate-fade-in"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {submitError}
                </div>
              )}

              <div>
                <label
                  htmlFor="c-name"
                  className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                >
                  Name
                </label>
                <input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  className={cx("input", errors.name && "border-red-400 focus:ring-red-200")}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "c-name-error" : undefined}
                />
                {errors.name && (
                  <p id="c-name-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="c-email"
                  className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                >
                  Email
                </label>
                <input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className={cx("input", errors.email && "border-red-400 focus:ring-red-200")}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "c-email-error" : undefined}
                />
                {errors.email && (
                  <p id="c-email-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="c-phone"
                  className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                >
                  Phone{" "}
                  <span className="font-normal text-ink-400 dark:text-ink-500">
                    (optional)
                  </span>
                </label>
                <input
                  id="c-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm({ ...form, phone: e.target.value })
                  }
                  placeholder="082 123 4567"
                  className={cx("input", errors.phone && "border-red-400 focus:ring-red-200")}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "c-phone-error" : undefined}
                />
                {errors.phone && (
                  <p id="c-phone-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.phone}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="c-msg"
                  className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                >
                  Message
                </label>
                <textarea
                  id="c-msg"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="How can we help you?"
                  className={cx(
                    "input resize-none",
                    errors.message && "border-red-400 focus:ring-red-200",
                  )}
                  aria-invalid={!!errors.message}
                  aria-describedby={errors.message ? "c-msg-error" : undefined}
                />
                {errors.message && (
                  <p id="c-msg-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.message}
                  </p>
                )}
              </div>

              <Turnstile
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
              />

              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full py-3 text-base"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send message <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
