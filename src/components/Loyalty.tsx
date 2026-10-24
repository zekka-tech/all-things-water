import { useCallback, useEffect, useState } from "react";
import { Gift, Loader2, Copy, Check, Sparkles } from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { supabase } from "@/lib/supabase";
import { captureException } from "@/lib/sentry";
import { clearStoredReferral, getStoredReferral } from "@/lib/referral";

interface LoyaltyState {
  points: number;
  lifetimePoints: number;
  referralCode: string;
  referred: boolean;
}

type Client = NonNullable<typeof supabase>;

async function fetchLoyalty(client: Client): Promise<LoyaltyState> {
  const { data: result, error } = await client.rpc("get_or_create_loyalty", {
    p_ref_code: getStoredReferral(),
  });
  if (error) throw error;
  const r = result as LoyaltyState & { error?: string };
  if (r?.error) throw new Error(r.error);
  return {
    points: r.points ?? 0,
    lifetimePoints: r.lifetimePoints ?? 0,
    referralCode: r.referralCode,
    referred: Boolean(r.referred),
  };
}

export function Loyalty() {
  const { user } = useAuth();
  const [data, setData] = useState<LoyaltyState | null>(null);
  // Starts true when there is something to load, so the first render shows
  // the spinner instead of an empty state.
  const [loading, setLoading] = useState(Boolean(user && supabase));
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // State is only set in promise callbacks (after the request settles), so
  // this is safe to call from an effect.
  const load = useCallback(() => {
    if (!user || !supabase) return;
    void fetchLoyalty(supabase)
      .then(
        (rewards) => {
          setData(rewards);
          setError(null);
          // Referral is linked server-side once; don't reapply on later visits.
          clearStoredReferral();
        },
        (err: unknown) => {
          setError("Could not load your rewards. Please try again.");
          captureException(err instanceof Error ? err : new Error(String(err)), {
            action: "loadLoyalty",
          });
        },
      )
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const reload = () => {
    setLoading(true);
    setError(null);
    load();
  };

  const referralLink = data
    ? `${window.location.origin}/?ref=${data.referralCode}`
    : "";

  const copy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900 dark:text-white">
        <Gift className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        Rewards
      </h2>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Earn 1 point for every R10 you spend, and 100 bonus points each time a
        friend you refer places their first order.
      </p>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      ) : data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 bg-linear-to-br from-brand-50 to-white p-5 dark:border-ink-800 dark:from-brand-500/10 dark:to-ink-900">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              <Sparkles className="h-3.5 w-3.5" /> Points balance
            </p>
            <p className="mt-2 font-display text-4xl font-extrabold text-ink-900 dark:text-white">
              {data.points.toLocaleString("en-ZA")}
            </p>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              {data.lifetimePoints.toLocaleString("en-ZA")} earned all-time
            </p>
          </div>

          <div className="rounded-xl border border-ink-200 p-5 dark:border-ink-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-500 dark:text-ink-400">
              Your referral link
            </p>
            <p className="mt-2 break-all font-mono text-sm text-ink-700 dark:text-ink-200">
              {referralLink}
            </p>
            <button
              type="button"
              onClick={copy}
              className="btn-outline mt-3 px-4 py-2 text-sm"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy link
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
