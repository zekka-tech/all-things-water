import type { CategoryMeta } from "@/types";

export const categories: CategoryMeta[] = [
  {
    id: "bottled-water",
    label: "Bottled Water",
    description: "Still & sparkling spring water, by the bottle and by the case.",
  },
  {
    id: "coolers",
    label: "Water Filters",
    description: "Water filtration solutions for cleaner, better-tasting water.",
  },
  {
    id: "dispensers",
    label: "Dispensers",
    description: "Bottle-based dispensers, hot-and-cold units and refillable bottles for home and office.",
  },
  {
    id: "accessories",
    label: "Accessories",
    description: "Caps, spares and the little things that complete the setup.",
  },
];

export const categoryLabel = (id: string): string =>
  categories.find((c) => c.id === id)?.label ?? id;
