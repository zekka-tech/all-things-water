export function stockStatus(
  stock: number,
): { label: string; color: string } {
  if (stock === 0) {
    return {
      label: "Out of stock",
      color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    };
  }

  if (stock <= 3) {
    return {
      label: "Low stock",
      color:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    };
  }

  return {
    label: "In stock",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  };
}
