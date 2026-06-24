// supabase/seed.ts
// Run with: deno run --allow-env --allow-net supabase/seed.ts
// Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
//
// Product data is mirrored from src/data/products.ts — keep in sync.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SeedProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: "bottled-water" | "coolers" | "dispensers" | "accessories";
  price: number;
  cost: number;
  unit: string;
  stock: number;
  image: string;
  features: string[];
  featured?: boolean;
  volumeMl?: number;
}

const products: SeedProduct[] = [
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
    image: "/src/assets/products/cooler-hotcold-ylr805lb.webp",
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
    image: "/src/assets/products/cooler-countertop-ylr95tb.webp",
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
    image: "/src/assets/products/dispenser-bottle-18-9l.webp",
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
    image: "/src/assets/products/bottle-caps-5gallon.webp",
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
    image: "/src/assets/products/monate-500ml.jpg",
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
    category: "bottled-water",
    price: 1500,
    cost: 1345,
    unit: "case of 12",
    stock: 1,
    image: "/src/assets/products/voss-original-800ml.webp",
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
    image: "/src/assets/products/aquafria-sparkling-500ml.png",
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
    image: "/src/assets/products/aquafria-still-500ml.png",
    volumeMl: 500,
    features: [
      "Case of 24 × 500ml",
      "Pure still water",
      "Recyclable PET bottles",
    ],
  },
];

async function seed() {
  const baseUrl = `${SUPABASE_URL}/rest/v1`;
  const headers = {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    Prefer: "resolution=merge-duplicates",
  };

  for (const p of products) {
    const body: Record<string, unknown> = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      category: p.category,
      price: p.price,
      cost: p.cost,
      unit: p.unit,
      stock: p.stock,
      image: p.image,
      features: p.features,
      featured: p.featured ?? false,
      volume_ml: p.volumeMl ?? null,
    };

    const res = await fetch(`${baseUrl}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    console.log(`${res.status} — ${p.name}`);
  }
  console.log("Seed complete.");
}

seed();
