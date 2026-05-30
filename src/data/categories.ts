import type { CategoryMeta } from "@/types";

export const categories: CategoryMeta[] = [
  {
    id: "bottled-water",
    label: "Bottled Water",
    description: "Still & sparkling spring water, by the bottle and by the case.",
  },
  {
    id: "coolers",
    label: "Water Coolers",
    description: "Hot & cold and counter-top coolers for home and office.",
  },
  {
    id: "dispensers",
    label: "Dispensers & Bottles",
    description: "Refillable dispenser bottles to keep the water flowing.",
  },
  {
    id: "accessories",
    label: "Accessories",
    description: "Caps, spares and the little things that complete the setup.",
  },
];

export const categoryLabel = (id: string): string =>
  categories.find((c) => c.id === id)?.label ?? id;
