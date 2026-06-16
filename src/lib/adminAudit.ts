import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/adminAuth";

interface AuditEvent {
  action: string;
  productId?: string;
  productName?: string;
  changes: Record<string, unknown>;
}

const STORAGE_KEY = "atw.admin.audit-log";

export function logAuditEvent(event: AuditEvent): void {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    existing.push({
      ...event,
      performedAt: new Date().toISOString(),
    });
    // Keep last 200 entries max
    const trimmed = existing.slice(-200);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export function getAuditLog(): (AuditEvent & { performedAt: string })[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function syncToSupabase(
  stockUpdates: Record<string, number>,
  auditEvents: AuditEvent[],
): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return false;

  const accessToken = await getAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        stockUpdates,
        auditEvents,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
