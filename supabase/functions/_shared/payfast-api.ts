/**
 * PayFast server-to-server API (api.payfast.co.za) — used for tokenized
 * ad-hoc charges of stored cards (recurring/auto-pay).
 *
 * The API signature differs from the checkout signature: it is the MD5 of ALL
 * request fields — the header fields (merchant-id, passphrase, timestamp,
 * version) PLUS the body fields — sorted ALPHABETICALLY by key (passphrase is
 * part of the sort, not appended at the end). Values use the same PayFast URL
 * encoding as the checkout flow.
 *
 * NOTE: tokenization must be enabled on the PayFast merchant account, and the
 * ad-hoc money path can only be validated against the PayFast sandbox — the
 * signature builder below is unit-tested for determinism/ordering/encoding.
 */
import { md5Hex, pfEncode } from "./payfast.ts";

export interface AdhocConfig {
  merchantId: string;
  passphrase?: string;
  sandbox: boolean;
}

export interface AdhocResult {
  ok: boolean;
  status: number;
  pfPaymentId?: string;
  raw?: string;
}

/**
 * Build the PayFast API signature: MD5 over all fields (incl. passphrase),
 * sorted alphabetically, PayFast-URL-encoded, joined with `&`.
 */
export function buildApiSignature(
  fields: Record<string, string>,
  passphrase?: string,
): string {
  const all: Record<string, string> = { ...fields };
  if (passphrase) all.passphrase = passphrase;
  const base = Object.keys(all)
    .sort()
    .map((k) => `${k}=${pfEncode(all[k])}`)
    .join("&");
  return md5Hex(base);
}

/** PayFast wants `YYYY-MM-DDTHH:mm:ss+00:00` (no milliseconds). */
function apiTimestamp(): string {
  return new Date().toISOString().split(".")[0] + "+00:00";
}

/**
 * Charge a stored card token ad-hoc. Returns ok=true only on an HTTP-2xx with a
 * truthy PayFast status. Never throws.
 */
export async function chargeAdhoc(
  token: string,
  amountRands: number,
  itemName: string,
  mPaymentId: string,
  config: AdhocConfig,
): Promise<AdhocResult> {
  const timestamp = apiTimestamp();
  const data: Record<string, string> = {
    amount: String(Math.round(amountRands * 100)), // cents
    item_name: itemName,
    m_payment_id: mPaymentId,
  };
  const headerFields: Record<string, string> = {
    "merchant-id": config.merchantId,
    timestamp,
    version: "v1",
  };
  const signature = buildApiSignature({ ...headerFields, ...data }, config.passphrase);

  const base = "https://api.payfast.co.za";
  const url =
    `${base}/subscriptions/${encodeURIComponent(token)}/adhoc` +
    (config.sandbox ? "?testing=true" : "");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "merchant-id": config.merchantId,
        version: "v1",
        timestamp,
        signature,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data).toString(),
    });
    const raw = await res.text();
    let ok = res.ok;
    let pfPaymentId: string | undefined;
    try {
      const json = JSON.parse(raw) as {
        status?: string;
        data?: { response?: unknown; pf_payment_id?: string | number };
      };
      // PayFast returns { status: "success", data: { response, pf_payment_id } }
      if (json.status && json.status !== "success") ok = false;
      const pid = json.data?.pf_payment_id;
      if (pid !== undefined) pfPaymentId = String(pid);
    } catch {
      // non-JSON body; rely on HTTP status
    }
    return { ok, status: res.status, pfPaymentId, raw };
  } catch (err) {
    return { ok: false, status: 0, raw: String(err) };
  }
}
