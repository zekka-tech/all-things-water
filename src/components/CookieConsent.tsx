import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { getConsentStatus, setConsentStatus } from "@/lib/consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getConsentStatus()) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    setConsentStatus("accepted");
    setVisible(false);
  };

  const decline = () => {
    setConsentStatus("declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="border-t border-ink-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm dark:border-ink-700 dark:bg-ink-900/95 sm:px-6">
        <div className="container-page flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-sm text-ink-600 dark:text-ink-300">
            <Cookie className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
            <span>
              We use cookies for analytics and service monitoring only if you accept them. See our{" "}
              <Link to="/privacy" className="font-medium text-brand-600 underline hover:text-brand-700 dark:text-brand-400">
                Privacy Policy
              </Link>
              .
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={decline}
              className="btn-ghost text-sm"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={accept}
              className="btn-primary px-4 py-1.5 text-sm"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
