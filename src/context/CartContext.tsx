import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";
import type { CartItem, Product } from "@/types";
import { products } from "@/data/products";
import { useCatalog } from "@/context/CatalogContext";

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; product: Product; quantity: number }
  | { type: "REMOVE"; productId: string }
  | { type: "SET_QTY"; productId: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "SYNC"; products: Product[] };

const STORAGE_KEY = "atw.cart.v1";

function clampToStock(product: Product, qty: number): number {
  if (!Number.isFinite(qty) || !Number.isFinite(product.stock)) return 0;
  const max = Math.max(0, Math.floor(product.stock));
  if (max === 0) return 0;
  return Math.min(Math.max(1, Math.floor(qty)), max, 1000);
}

function restoreCart(): CartState {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(saved)) return { items: [] };
    const items = new Map<string, CartItem>();
    for (const entry of saved) {
      if (!entry || typeof entry !== "object" || !Number.isInteger(entry.quantity) || entry.quantity <= 0) continue;
      const id: unknown = entry.product?.id;
      if (typeof id !== "string" || !id || id.length > 64) continue;
      // New server products may not be in the bundle. Keep only their id
      // until the live catalogue supplies trusted display and price fields.
      const product: Product = products.find((p) => p.id === id) ?? {
        id, slug: "", name: "Loading product…", tagline: "", description: "",
        category: "accessories", price: 0, cost: 0, unit: "", stock: 0,
        image: "/favicon.svg", features: [],
      };
      const quantity = Math.min(1000, (items.get(product.id)?.quantity ?? 0) + entry.quantity);
      if (quantity > 0) items.set(product.id, { product, quantity });
    }
    return { items: [...items.values()] };
  } catch {
    return { items: [] };
  }
}

function reducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "SYNC":
      return { items: state.items.flatMap((item) => {
        const product = action.products.find((p) => p.id === item.product.id);
        if (!product) return [];
        const quantity = clampToStock(product, item.quantity);
        return quantity > 0 ? [{ product, quantity }] : [];
      }) };
    case "ADD": {
      if (!Number.isFinite(action.quantity) || action.quantity <= 0) return state;
      const existing = state.items.find((i) => i.product.id === action.product.id);
      if (existing) {
        const quantity = clampToStock(
          action.product,
          existing.quantity + action.quantity,
        );
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id ? { product: action.product, quantity } : i,
          ).filter((i) => i.quantity > 0),
        };
      }
      const quantity = clampToStock(action.product, action.quantity);
      if (quantity === 0) return state;
      return { items: [...state.items, { product: action.product, quantity }] };
    }
    case "SET_QTY": {
      if (!Number.isFinite(action.quantity)) return state;
      return {
        items: state.items
          .map((i) =>
            i.product.id === action.productId
              ? { ...i, quantity: clampToStock(i.product, action.quantity) }
              : i,
          )
          .filter((i) => i.quantity > 0),
      };
    }
    case "REMOVE":
      return { items: state.items.filter((i) => i.product.id !== action.productId) };
    case "CLEAR":
      return { items: [] };
    default:
      return state;
  }
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  quantityOf: (productId: string) => number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, restoreCart);
  const { products: catalog, ready } = useCatalog();

  // Refresh saved prices and availability when the server catalogue changes.
  useEffect(() => {
    if (ready) dispatch({ type: "SYNC", products: catalog });
  }, [catalog, ready]);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      /* storage may be unavailable */
    }
  }, [state.items]);

  const addItem = useCallback(
    (product: Product, quantity = 1) => dispatch({ type: "ADD", product, quantity }),
    [],
  );
  const removeItem = useCallback(
    (productId: string) => dispatch({ type: "REMOVE", productId }),
    [],
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      dispatch({ type: "SET_QTY", productId, quantity }),
    [],
  );
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = state.items.reduce(
      (sum, i) => sum + i.product.price * i.quantity,
      0,
    );
    const quantityOf = (productId: string) =>
      state.items.find((i) => i.product.id === productId)?.quantity ?? 0;
    return {
      items: state.items,
      count,
      subtotal,
      addItem,
      removeItem,
      setQuantity,
      clear,
      quantityOf,
    };
  }, [state.items, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
