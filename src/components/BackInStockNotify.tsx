import { useState } from "react";
import { Bell, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { env } from "@/lib/env";
import { apiPost } from "@/lib/api";
import { captureException } from "@/lib/sentry";

interface Props {
  productId: string;
}

export function BackInStockNotify({ productId }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const result = await apiPost<{ ok: boolean; subscribed: boolean; message?: string }>(
        `${env.supabaseUrl}/functions/v1/back-in-stock`,
        { email: email.trim(), productId },
      );

      if (!result.subscribed && result.message) {
        setStatus("error");
        setMessage(result.message);
      } else {
        setStatus("success");
        setMessage("You'll be notified as soon as this item is back in stock.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      captureException(err instanceof Error ? err : new Error(String(err)), { action: "backInStock" });
    }
  };

  if (status === "success") {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-500/10">
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50/50 px-4 py-4 dark:border-ink-700 dark:bg-ink-800/30">
      <p className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-ink-200">
        <Bell className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        Get notified when it&rsquo;s back
      </p>
      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          aria-label="Email for back-in-stock notification"
          className="input flex-1"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-primary px-5 py-2.5 text-sm whitespace-nowrap"
        >
          {status === "loading" ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Subscribing&hellip;
            </span>
          ) : (
            "Notify me"
          )}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          {message}
        </p>
      )}
    </div>
  );
}