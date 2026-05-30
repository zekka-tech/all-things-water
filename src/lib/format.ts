/** Format a number as South African Rand. */
export const formatZAR = (amount: number): string =>
  new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);

export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(" ");
