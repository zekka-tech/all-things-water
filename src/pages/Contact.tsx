import { useState } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";
import { Seo } from "@/components/Seo";
import { cx } from "@/lib/format";

export function Contact() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!form.message.trim()) next.message = "Please enter a message.";
    setErrors(next);
    if (Object.keys(next).length === 0) setSent(true);
  };

  return (
    <>
      <Seo title="Contact" description="Get in touch with the All Things Water team." />

      <div className="container-page grid gap-10 py-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Get in touch</h1>
          <p className="mt-3 text-ink-600 dark:text-ink-300">
            Questions about an order, bulk pricing or a cooler setup? Send us a message and we'll get
            back to you.
          </p>

          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800">
                <Phone className="h-5 w-5" />
              </span>
              +27 00 000 0000
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800">
                <Mail className="h-5 w-5" />
              </span>
              hello@allthingswater.co.za
            </li>
            <li className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-ink-800">
                <MapPin className="h-5 w-5" />
              </span>
              South Africa
            </li>
          </ul>
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="grid place-items-center py-12 text-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold">Message sent</h2>
              <p className="mt-2 text-sm text-ink-500">
                Thanks {form.name.split(" ")[0]} — we'll be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="c-name" className="mb-1 block text-sm font-medium">Name</label>
                <input
                  id="c-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={cx("input", errors.name && "border-red-400")}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="c-email" className="mb-1 block text-sm font-medium">Email</label>
                <input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={cx("input", errors.email && "border-red-400")}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="c-msg" className="mb-1 block text-sm font-medium">Message</label>
                <textarea
                  id="c-msg"
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className={cx("input resize-none", errors.message && "border-red-400")}
                />
                {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
              </div>
              <button type="submit" className="btn-primary w-full py-3">
                Send message <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
