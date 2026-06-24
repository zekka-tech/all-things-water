import type { Product, Review } from "@/types";

import hotCold from "@/assets/products/cooler-hotcold-ylr805lb.webp";
import counterTop from "@/assets/products/cooler-countertop-ylr95tb.webp";
import dispenserBottle from "@/assets/products/dispenser-bottle-18-9l.webp";
import caps from "@/assets/products/bottle-caps-5gallon.webp";
import monate from "@/assets/products/monate-500ml.jpg";
import voss from "@/assets/products/voss-original-800ml.webp";
import aquafriaSparkling from "@/assets/products/aquafria-sparkling-500ml.png";
import aquafriaStill from "@/assets/products/aquafria-still-500ml.png";

/**
 * Catalog sourced from the company's "Item Pricing" sheet.
 * Prices are in ZAR. Bottled water is priced per case; equipment per unit.
 */
export const products: Product[] = [
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
    image: hotCold,
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
    image: counterTop,
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
    image: dispenserBottle,
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
    image: caps,
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
    image: monate,
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
    image: voss,
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
    image: aquafriaSparkling,
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
    image: aquafriaStill,
    volumeMl: 500,
    features: [
      "Case of 24 × 500ml",
      "Pure still water",
      "Recyclable PET bottles",
    ],
  },
];

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

export const getRelatedProducts = (product: Product, limit = 3): Product[] =>
  products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, limit);

export const featuredProducts = (): Product[] => products.filter((p) => p.featured);

export const productReviews: Review[] = [
  { id: "r1", productId: "cooler-ylr805lb", author: "Thandi M.", rating: 5, date: "2026-05-12", comment: "Best investment for our office. Hot and cold water on tap — everyone loves it. Delivery was quick and installation was a breeze." },
  { id: "r2", productId: "cooler-ylr805lb", author: "Pieter van Wyk", rating: 4, date: "2026-04-28", comment: "Solid cooler, works perfectly. Only wish it came in black to match our office decor." },
  { id: "r3", productId: "cooler-ylr805lb", author: "Sarah K.", rating: 5, date: "2026-03-15", comment: "We've had this for 3 months now and it's running flawlessly. The hot water tap is a game-changer for tea." },
  { id: "r4", productId: "dispenser-bottle-18-9l", author: "James N.", rating: 5, date: "2026-05-20", comment: "Sturdy bottle, good quality. Exactly what we needed for our cooler. Much better than the cheap ones." },
  { id: "r5", productId: "dispenser-bottle-18-9l", author: "Lerato S.", rating: 4, date: "2026-04-10", comment: "Good quality bottle, fits perfectly. Would be nice to have a handle option." },
  { id: "r6", productId: "monate-500ml", author: "David P.", rating: 5, date: "2026-06-01", comment: "The best-tasting bottled water I've found. Great price for a case of 24. Will be ordering regularly." },
  { id: "r7", productId: "monate-500ml", author: "Zandile N.", rating: 5, date: "2026-05-18", comment: "Fresh, crisp taste. My kids love these in their lunchboxes. Fast delivery too." },
  { id: "r8", productId: "monate-500ml", author: "Mike R.", rating: 4, date: "2026-04-22", comment: "Good value for money. The bottles are a good size and the water tastes great." },
  { id: "r9", productId: "voss-original-800ml", author: "Amanda L.", rating: 5, date: "2026-05-05", comment: "Premium quality through and through. Served these at a client event and got so many compliments." },
  { id: "r10", productId: "voss-original-800ml", author: "Robert M.", rating: 4, date: "2026-03-30", comment: "Excellent water, beautiful glass bottle. A bit pricey but worth it for special occasions." },
  { id: "r11", productId: "aquafria-sparkling-500ml", author: "Catherine D.", rating: 5, date: "2026-05-25", comment: "Perfect amount of fizz. Not too aggressive like some sparkling waters. My new go-to." },
  { id: "r12", productId: "aquafria-sparkling-500ml", author: "Sipho T.", rating: 4, date: "2026-04-15", comment: "Great sparkling water, nice crisp taste. Good value for the case." },
  { id: "r13", productId: "aquafria-still-500ml", author: "Nomsa B.", rating: 5, date: "2026-05-28", comment: "Clean, refreshing taste. We now order a case every month for the family." },
  { id: "r14", productId: "aquafria-still-500ml", author: "Tom H.", rating: 4, date: "2026-04-05", comment: "Good still water. The 500ml size is convenient. Delivery was prompt." },
  { id: "r15", productId: "cooler-ylr95tb", author: "Fatima A.", rating: 4, date: "2026-02-20", comment: "Compact and fits perfectly on our kitchen counter. Does the job well for a small household." },
  { id: "r16", productId: "bottle-caps-5gallon", author: "Kevin J.", rating: 5, date: "2026-05-10", comment: "Simple but essential. Good quality caps that don't leak. Great price too." },
  { id: "r17", productId: "bottle-caps-5gallon", author: "Priya M.", rating: 5, date: "2026-04-18", comment: "These caps fit perfectly on our 5-gallon bottles. No more spills in the car on the way back from refills." },
];

export const getProductReviews = (productId: string): Review[] =>
  productReviews.filter((r) => r.productId === productId);
