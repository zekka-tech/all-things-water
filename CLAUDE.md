# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: standalone app

This is a **standalone application** — do **not** merge it into any parent `master` branch. It was forked from a `water-filter-company` project and must remain independent.

## Commands

```bash
npm run dev        # dev server on http://localhost:5180 (auto-opens browser)
npm run build      # type-check (tsc -b) then Vite production build → dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint across all source files
npm run typecheck  # tsc -b --noEmit (type-check without emitting)
```

There are no tests in this project.

## Architecture

**Stack:** React 18, TypeScript, Vite 5, Tailwind CSS 3, React Router 6, lucide-react.

**Provider tree** (`src/main.tsx`):
```
ThemeProvider → BrowserRouter → CartProvider → App
```

**Routing** (`src/App.tsx`): `Layout` wraps all routes. Pages: `/`, `/shop`, `/product/:slug`, `/cart`, `/checkout`, `/about`, `/contact`.

**Data layer** — no backend, no API. All product data lives in `src/data/products.ts` as a static array. Prices are in ZAR. Editing that file is how you add/update products, prices, and stock.

**State management:**
- `CartContext` (`src/context/CartContext.tsx`) — `useReducer`-based, persisted to `localStorage` under key `atw.cart.v1`. Enforces stock limits via `clampToStock`.
- `ThemeContext` (`src/context/ThemeContext.tsx`) — light/dark toggle, persisted under `atw.theme`, synced to `document.documentElement.classList`.

**Tailwind conventions:**
- Custom colour scales: `brand-*` (blue) and `ink-*` (grey) — defined in `tailwind.config.js`.
- Dark mode via `class` strategy (toggled by `ThemeContext`).
- Utility classes like `container-page`, `btn-primary`, `input` are defined as component layers in `src/index.css`.
- Conditional class merging uses the local `cx()` helper in `src/lib/format.ts` (not a third-party library).

**Path alias:** `@` resolves to `src/` (configured in `vite.config.ts` and both `tsconfig` files).

**Key utilities** (`src/lib/format.ts`):
- `formatZAR(amount)` — formats numbers as South African Rand using `Intl.NumberFormat`.
- `cx(...classes)` — lightweight classname joiner.

**Delivery logic** (in `src/pages/Checkout.tsx`): free delivery above R500; R75 fee below. `DELIVERY_THRESHOLD` and `DELIVERY_FEE` are constants at the top of that file.

**SEO:** The `<Seo>` component (`src/components/Seo.tsx`) imperatively updates `document.title` and the meta description tag — it renders nothing to the DOM.

**Build output:** Vendor chunks are manually split — `react`/`react-dom`/`react-router-dom` into one chunk, `lucide-react` into another (`vite.config.ts`).
