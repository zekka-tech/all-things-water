import { useState } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { cx } from "@/lib/format";

const contactInfo = [
  { icon: Phone, label: "Phone", value: "+27 00 000 0000" },
  { icon: Mail, label: "Email", value: "hello@allthingswater.co.za" },
  { icon: MapPin, label: "Location", value: "South Africa" },
];

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email.";
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

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
            Questions about an order, bulk pricing or a cooler setup? Send us a message and we'll get
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

          <div className="mt-10 rounded-2xl bg-brand-50 p-5 dark:bg-brand-900/20">
            <p className="text-sm font-semibold text-ink-800 dark:text-ink-200">
              Bulk orders &amp; business accounts
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Setting up a full office? We offer volume pricing and recurring delivery schedules.
              Reach out and let's build a plan that works for you.
            </p>
          </div>
        </div>

        {/* Right — form */}
        <div className="card p-6">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
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
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p>
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
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.email}</p>
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
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.message}</p>
                )}
              </div>

              <button type="submit" className="btn-primary w-full py-3 text-base">
                Send message <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
