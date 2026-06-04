import { formatZAR } from "@/lib/format";
import { env } from "@/lib/env";

export function buildWhatsAppUrl(message: string): string {
  const number = env.whatsappNumber.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildOrderWhatsAppMessage(
  orderRef: string,
  total: number,
): string {
  return `Hi All Things Water, I've placed order ${orderRef} for ${formatZAR(total)}. Thanks!`;
}
