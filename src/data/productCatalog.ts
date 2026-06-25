import type { Category } from "../types";

export interface ProductCatalogItem {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: Category;
  price: number;
  cost: number;
  unit: string;
  stock: number;
  features: string[];
  featured?: boolean;
  volumeMl?: number;
}

export const productCatalog: ProductCatalogItem[] = [
  {
    id: "atw-001",
    slug: "hot-cold-water-cooler-ylr-805lb",
    name: "Hot & Cold Water Cooler YLR-805LB",
    tagline: "Instant hot and chilled water for home or office.",
    description:
      "A free-standing floor cooler that delivers piping-hot and refreshingly-cold water on demand. The YLR-805LB takes standard 18.9L bottles and is built for busy kitchens, reception areas and offices.",
    category: "dispensers",
    price: 2645,
    cost: 2300,
    unit: "each",
    stock: 2,
    featured: true,
    features: [
      "Separate hot (90–95°C) and cold (5–10°C) taps",
      "Fits standard 18.9L / 5-gallon bottles",
      "Child-safe hot-water lock",
      "Stainless internal tank",
    ],
  },
  {
    id: "atw-002",
    slug: "counter-top-water-cooler-ylr-95tb",
    name: "Counter Top Water Cooler YLR 95TB",
    tagline: "Compact cooling that fits on any counter.",
    description:
      "A space-saving counter-top cooler that brings cold, great-tasting water to smaller offices, kitchenettes and homes without taking up floor space.",
    category: "dispensers",
    price: 1800,
    cost: 1350,
    unit: "each",
    stock: 0,
    featured: true,
    features: [
      "Counter-top footprint",
      "Fast cold-water delivery",
      "Takes standard 18.9L bottles",
      "Energy-efficient compressor",
    ],
  },
  {
    id: "atw-003",
    slug: "18-9l-dispenser-bottle",
    name: "18.9L Water Dispenser Bottle",
    tagline: "Refillable 18.9L bottle to keep things flowing.",
    description:
      "A durable 18.9-litre (5-gallon) refillable bottle designed for all standard top-loading coolers and dispensers. The handle-free design stacks and stores neatly.",
    category: "dispensers",
    price: 150,
    cost: 86,
    unit: "each",
    stock: 6,
    featured: true,
    features: [
      "18.9 litre capacity",
      "Food-grade, BPA-conscious build",
      "Fits all standard top-load coolers",
      "Reusable & refillable",
    ],
  },
  {
    id: "atw-004",
    slug: "5-gallon-bottle-caps",
    name: "Caps for 5-Gallon Bottle",
    tagline: "Keep your refills sealed and spill-free.",
    description:
      "Replacement screw caps for 5-gallon / 18.9L water bottles. Seal opened bottles for transport and storage, or keep spares on hand for refills.",
    category: "accessories",
    price: 10,
    cost: 4,
    unit: "each",
    stock: 50,
    features: [
      "Fits standard 5-gallon bottle necks",
      "Leak-resistant seal",
      "Sold individually — bulk discounts available",
    ],
  },
  {
    id: "atw-005",
    slug: "monate-water-500ml-case",
    name: "Monate Water 500ml",
    tagline: "Crisp local still water, by the case.",
    description:
      "Monate still mineral water in convenient 500ml bottles. Sold as a case of 24 — perfect for events, boardrooms and keeping the fridge stocked.",
    category: "bottled-water",
    price: 175,
    cost: 145,
    unit: "case of 24",
    stock: 2,
    volumeMl: 500,
    featured: true,
    features: [
      "Case of 24 × 500ml",
      "Still mineral water",
      "Recyclable PET bottles",
    ],
  },
  {
    id: "atw-006",
    slug: "voss-original-800ml-case",
    name: "Voss Original 800ml",
    tagline: "Iconic Norwegian still water — premium glass.",
    description:
      "VOSS artesian still water in the signature 800ml cylinder. A premium centrepiece for fine dining, hospitality and gifting. Sold as a case of 12.",
    category: "accessories",
    price: 1500,
    cost: 1345,
    unit: "case of 12",
    stock: 1,
    volumeMl: 800,
    features: [
      "Case of 12 × 800ml",
      "Artesian still water",
      "Premium presentation bottle",
    ],
  },
  {
    id: "atw-007",
    slug: "aquafria-sparkling-500ml-case",
    name: "Aquafria Sparkling 500ml",
    tagline: "Lively sparkling water with a clean finish.",
    description:
      "Aquafria sparkling water in 500ml bottles — bright, fine bubbles and a clean taste. Sold as a case of 24 for the table or the fridge.",
    category: "bottled-water",
    price: 120,
    cost: 100,
    unit: "case of 24",
    stock: 3,
    volumeMl: 500,
    featured: true,
    features: [
      "Case of 24 × 500ml",
      "Naturally crisp carbonation",
      "Recyclable PET bottles",
    ],
  },
  {
    id: "atw-008",
    slug: "aquafria-still-500ml-case",
    name: "Aquafria Still 500ml",
    tagline: "Everyday still water in handy 500ml bottles.",
    description:
      "Aquafria still water in 500ml bottles — pure, refreshing and easy to grab on the go. Sold as a case of 24.",
    category: "bottled-water",
    price: 120,
    cost: 100,
    unit: "case of 24",
    stock: 3,
    volumeMl: 500,
    features: [
      "Case of 24 × 500ml",
      "Pure still water",
      "Recyclable PET bottles",
    ],
  },
];
