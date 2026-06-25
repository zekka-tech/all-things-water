import type { Product, Review } from "@/types";

import hotCold from "@/assets/products/cooler-hotcold-ylr805lb.webp";
import counterTop from "@/assets/products/cooler-countertop-ylr95tb.webp";
import dispenserBottle from "@/assets/products/dispenser-bottle-18-9l.webp";
import caps from "@/assets/products/bottle-caps-5gallon.webp";
import monate from "@/assets/products/monate-500ml.jpg";
import voss from "@/assets/products/voss-original-800ml.webp";
import aquafriaSparkling from "@/assets/products/aquafria-sparkling-500ml.png";
import aquafriaStill from "@/assets/products/aquafria-still-500ml.png";
import { productCatalog } from "./productCatalog";

const productImages: Record<string, string> = {
  "atw-001": hotCold,
  "atw-002": counterTop,
  "atw-003": dispenserBottle,
  "atw-004": caps,
  "atw-005": monate,
  "atw-006": voss,
  "atw-007": aquafriaSparkling,
  "atw-008": aquafriaStill,
};

/**
 * Catalog sourced from the company's "Item Pricing" sheet.
 * Prices are in ZAR. Bottled water is priced per case; equipment per unit.
 */
export const products: Product[] = productCatalog.map((product) => {
  const image = productImages[product.id];

  if (!image) {
    throw new Error(`Missing product image for ${product.id}`);
  }

  return { ...product, image };
});

export const getProductBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);

export const getRelatedProducts = (product: Product, limit = 3): Product[] =>
  products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .concat(products.filter((p) => p.id !== product.id && p.category !== product.category))
    .slice(0, limit);

export const featuredProducts = (): Product[] => products.filter((p) => p.featured);

export const productReviews: Review[] = [
  { id: "r1", productId: "atw-001", author: "Thandi M.", rating: 5, date: "2026-05-12", comment: "Best investment for our office. Hot and cold water on tap — everyone loves it. Delivery was quick and installation was a breeze." },
  { id: "r2", productId: "atw-001", author: "Pieter van Wyk", rating: 4, date: "2026-04-28", comment: "Solid cooler, works perfectly. Only wish it came in black to match our office decor." },
  { id: "r3", productId: "atw-001", author: "Sarah K.", rating: 5, date: "2026-03-15", comment: "We've had this for 3 months now and it's running flawlessly. The hot water tap is a game-changer for tea." },
  { id: "r4", productId: "atw-003", author: "James N.", rating: 5, date: "2026-05-20", comment: "Sturdy bottle, good quality. Exactly what we needed for our cooler. Much better than the cheap ones." },
  { id: "r5", productId: "atw-003", author: "Lerato S.", rating: 4, date: "2026-04-10", comment: "Good quality bottle, fits perfectly. Would be nice to have a handle option." },
  { id: "r6", productId: "atw-005", author: "David P.", rating: 5, date: "2026-06-01", comment: "The best-tasting bottled water I've found. Great price for a case of 24. Will be ordering regularly." },
  { id: "r7", productId: "atw-005", author: "Zandile N.", rating: 5, date: "2026-05-18", comment: "Fresh, crisp taste. My kids love these in their lunchboxes. Fast delivery too." },
  { id: "r8", productId: "atw-005", author: "Mike R.", rating: 4, date: "2026-04-22", comment: "Good value for money. The bottles are a good size and the water tastes great." },
  { id: "r9", productId: "atw-006", author: "Amanda L.", rating: 5, date: "2026-05-05", comment: "Premium quality through and through. Served these at a client event and got so many compliments." },
  { id: "r10", productId: "atw-006", author: "Robert M.", rating: 4, date: "2026-03-30", comment: "Excellent water, beautiful glass bottle. A bit pricey but worth it for special occasions." },
  { id: "r11", productId: "atw-007", author: "Catherine D.", rating: 5, date: "2026-05-25", comment: "Perfect amount of fizz. Not too aggressive like some sparkling waters. My new go-to." },
  { id: "r12", productId: "atw-007", author: "Sipho T.", rating: 4, date: "2026-04-15", comment: "Great sparkling water, nice crisp taste. Good value for the case." },
  { id: "r13", productId: "atw-008", author: "Nomsa B.", rating: 5, date: "2026-05-28", comment: "Clean, refreshing taste. We now order a case every month for the family." },
  { id: "r14", productId: "atw-008", author: "Tom H.", rating: 4, date: "2026-04-05", comment: "Good still water. The 500ml size is convenient. Delivery was prompt." },
  { id: "r15", productId: "atw-002", author: "Fatima A.", rating: 4, date: "2026-02-20", comment: "Compact and fits perfectly on our kitchen counter. Does the job well for a small household." },
  { id: "r16", productId: "atw-004", author: "Kevin J.", rating: 5, date: "2026-05-10", comment: "Simple but essential. Good quality caps that don't leak. Great price too." },
  { id: "r17", productId: "atw-004", author: "Priya M.", rating: 5, date: "2026-04-18", comment: "These caps fit perfectly on our 5-gallon bottles. No more spills in the car on the way back from refills." },
];

export const getProductReviews = (productId: string): Review[] =>
  productReviews.filter((r) => r.productId === productId);
