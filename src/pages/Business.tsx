import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Send,
  AlertTriangle,
  Loader2,
  Droplets,
  CalendarClock,
  ReceiptText,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { Turnstile } from "@/components/Turnstile";
import { turnstileEnabled } from "@/lib/turnstile";
import { cx } from "@/lib/format";
import { env } from "@/lib/env";
import { apiPost } from "@/lib/api";
import { validateEmail, validatePhone } from "@/lib/validation";

const benefits = [
  {
    icon: Droplets,
    title: "Dispensers, coolers & refills",
    body: "Floor-standing and countertop coolers plus a standing supply of 18.9 L bottles — installed and kept stocked.",
  },
  {
    icon: CalendarClock,
    title: "Recurring delivery on your schedule",
    body: "Weekly, fortnightly or monthly drops across Gauteng with transparent, self-serve scheduling.",
  },
  {
    icon: ReceiptText,
    title: "Invoiced billing & volume pricing",
    body: "Consolidated monthly invoicing and tiered pricing that improves as your team grows.",
  },
];

const interestOptions = [
  "Dispensers / coolers",
  "Bottled water supply",
  "Filters & cartridges",
  "Full office setup",
  "Not sure yet",
];

export function Business() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    teamSize: "",
    interest: interestOptions[0],
    message: "",
  });
  const [errors, setErrors] = useState<{
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
  }>({});

  const validate = (): boolean => {
    const next: typeof errors = {};
    if (!form.companyName.trim()) next.companyName = "Please enter your company name.";
    if (!form.contactName.trim()) next.contactName = "Please enter your name.";
    if (!validateEmail(form.email)) next.email = "Enter a valid email address.";
    if (form.phone.trim() && !validatePhone(form.phone)) {
      next.phone = "Enter a valid SA number (e.g. 082 123 4567).";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setSubmitError(
        "Business enquiries are temporarily unavailable. Please email or WhatsApp us instead.",
      );
      return;
    }

    if (turnstileEnabled() && !turnstileToken) {
      setSubmitError("Please complete the verification below.");
      return;
    }

    setSending(true);
    try {
      await apiPost(
        `${env.supabaseUrl}/functions/v1/business-quote`,
        {
          companyName: form.companyName.trim(),
          contactName: form.contactName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          teamSize: form.teamSize.trim() || undefined,
          interest: form.interest || undefined,
          message: form.message.trim() || undefined,
          turnstileToken: turnstileToken || undefined,
        },
        {
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${env.supabaseAnonKey}`,
        },
      );
      setSent(true);
    } catch {
      setSubmitError(
        "We couldn't submit your request right now. Please try again or email us.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Seo
        title="Business & office water"
        description="Office water dispensers, coolers and recurring bottled-water delivery with invoiced billing and volume pricing across Gauteng. Request a quote."
      />

      <div className="container-page grid gap-12 py-14 lg:grid-cols-2">
        {/* Left — pitch */}
        <div>
          <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            For business
          </span>
          <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Office water, sorted.
          </h1>
          <p className="mt-3 max-w-md leading-relaxed text-ink-600 dark:text-ink-300">
            Keep your team hydrated without the admin. We set up dispensers and
            coolers, keep the bottles coming on a schedule that suits you, and
            bill you on a single monthly invoice.
          </p>

          <ul className="mt-8 space-y-5">
            {benefits.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <div className="icon-wrap shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display font-semibold text-ink-900 dark:text-ink-50">
                    {title}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                    {body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — quote form */}
        <div className="card p-6">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {sending && "Submitting your request…"}
            {sent && "Request submitted successfully!"}
            {submitError && `Error: ${submitError}`}
          </div>

          {sent ? (
            <div className="flex flex-col items-center justify-center py-14 text-center animate-scale-in">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="mt-5 font-display text-xl font-bold text-ink-900 dark:text-white">
                Request received!
              </h2>
              <p className="mt-2 max-w-xs text-sm text-ink-500 dark:text-ink-400">
                Thanks {form.contactName.split(" ")[0]} — we'll be in touch within
                one business day with a tailored quote for {form.companyName}.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div className="flex items-center gap-2 text-ink-500 dark:text-ink-400">
                <Building2 className="h-4 w-4" />
                <p className="text-sm">Tell us about your team and we'll quote you.</p>
              </div>

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
                <label htmlFor="b-company" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                  Company name
                </label>
                <input
                  id="b-company"
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  placeholder="Acme (Pty) Ltd"
                  className={cx("input", errors.companyName && "border-red-400 focus:ring-red-200")}
                  aria-invalid={!!errors.companyName}
                  aria-describedby={errors.companyName ? "b-company-error" : undefined}
                />
                {errors.companyName && (
                  <p id="b-company-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.companyName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="b-name" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                  Your name
                </label>
                <input
                  id="b-name"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Your name"
                  className={cx("input", errors.contactName && "border-red-400 focus:ring-red-200")}
                  aria-invalid={!!errors.contactName}
                  aria-describedby={errors.contactName ? "b-name-error" : undefined}
                />
                {errors.contactName && (
                  <p id="b-name-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {errors.contactName}
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="b-email" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Email
                  </label>
                  <input
                    id="b-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@company.co.za"
                    className={cx("input", errors.email && "border-red-400 focus:ring-red-200")}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "b-email-error" : undefined}
                  />
                  {errors.email && (
                    <p id="b-email-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="b-phone" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Phone <span className="font-normal text-ink-400 dark:text-ink-500">(optional)</span>
                  </label>
                  <input
                    id="b-phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="082 123 4567"
                    className={cx("input", errors.phone && "border-red-400 focus:ring-red-200")}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "b-phone-error" : undefined}
                  />
                  {errors.phone && (
                    <p id="b-phone-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="b-size" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Team size <span className="font-normal text-ink-400 dark:text-ink-500">(optional)</span>
                  </label>
                  <input
                    id="b-size"
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: e.target.value })}
                    placeholder="e.g. 25"
                    className="input"
                  />
                </div>

                <div>
                  <label htmlFor="b-interest" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Interested in
                  </label>
                  <select
                    id="b-interest"
                    value={form.interest}
                    onChange={(e) => setForm({ ...form, interest: e.target.value })}
                    className="input"
                  >
                    {interestOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="b-msg" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                  Anything else? <span className="font-normal text-ink-400 dark:text-ink-500">(optional)</span>
                </label>
                <textarea
                  id="b-msg"
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Delivery location, current setup, timelines…"
                  className="input resize-none"
                />
              </div>

              <Turnstile
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
              />

              <button type="submit" disabled={sending} className="btn-primary w-full py-3 text-base">
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Request a quote <Send className="h-4 w-4" />
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
