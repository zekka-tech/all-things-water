export type Category = "bottled-water" | "coolers" | "dispensers" | "accessories";

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Short marketing tagline shown on cards. */
  tagline: string;
  /** Longer description for the product detail page. */
  description: string;
  category: Category;
  /** Selling price in ZAR (per pack/unit as described by `unit`). */
  price: number;
  /** Internal cost — used to flag deals, never shown to customers. */
  cost: number;
  /** What one purchase unit represents, e.g. "pack of 24" or "each". */
  unit: string;
  /** Units of `unit` in stock. */
  stock: number;
  image: string;
  /** Highlight bullet points for the detail page. */
  features: string[];
  /** Whether to feature on the home page. */
  featured?: boolean;
  /** Optional volume in millilitres, for bottled water sorting/filtering. */
  volumeMl?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CategoryMeta {
  id: Category;
  label: string;
  description: string;
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
}
