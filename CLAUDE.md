# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: standalone app

This is a **standalone application** — do **not** merge it into any parent `master` branch. It was forked from a `water-filter-company` project and must remain independent.

## Commands

```bash
npm run dev        # dev server on http://localhost:5180 (auto-opens browser)
npm run build      # type-check (tsc -b) then Vite production build → dist/
npm run preview    # serve the production build locally
npm run lint       # ESLint across all source files (excludes supabase/)
npm run typecheck  # tsc -b --noEmit (type-check without emitting)
npm test           # Vitest unit tests
npm run test:db    # apply all migrations to a throwaway Postgres (Docker) + run supabase/tests/security.sql
npm run deno:check # Deno type-check of supabase/functions/
npm run deno:test  # Deno unit tests for PayFast signature builder
```

**Tests:** Vitest tests colocated in `src/`. Deno tests for Edge Function shared utilities in `supabase/functions/_shared/*.test.ts`. SQL security regression tests (RLS, grants, pricing, loyalty) in `supabase/tests/security.sql`.

**Security conventions** (see `SECURITY_AUDIT.md`):
- New Postgres functions are not executable by `anon`/`authenticated` by default (migration 016); grant explicitly and add a test to `security.sql`.
- Table grants are least-privilege (migration 017); a new table gets no client access until you grant it.
- Edge Functions: parse bodies with `readJson`, identify users with `getVerifiedUser`/`requireAdmin` (never decode JWTs by hand), compare secrets with `timingSafeEqual`, escape email HTML with `escapeHtml`.

## Architecture

**Stack:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, lucide-react.

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
- Theme lives in CSS: colour scales `brand-*` (blue) and `ink-*` (grey), fonts, shadows and animations are defined in the `@theme` block of `src/index.css` (there is no `tailwind.config.js`). Built via `@tailwindcss/postcss`.
- Dark mode via the `.dark` class (`@custom-variant dark` in `src/index.css`, toggled by `ThemeContext`).
- Utility classes like `container-page`, `btn-primary`, `input` are defined as `@utility` blocks in `src/index.css`.
- Conditional class merging uses the local `cx()` helper in `src/lib/format.ts` (not a third-party library).

**Path alias:** `@` resolves to `src/` (configured in `vite.config.ts` and both `tsconfig` files).

**Key utilities** (`src/lib/format.ts`):
- `formatZAR(amount)` — formats numbers as South African Rand using `Intl.NumberFormat`.
- `cx(...classes)` — lightweight classname joiner.

**Delivery logic** (`src/lib/delivery.ts`, mirrored in `supabase/functions/_shared/delivery.ts` and in `create_order` SQL): free delivery from R500; R75 fee below.

**SEO:** The `<Seo>` component (`src/components/Seo.tsx`) imperatively updates `document.title` and the meta description tag — it renders nothing to the DOM.

**Build output:** Vendor chunks are manually split — `react`/`react-dom`/`react-router` into one chunk, `lucide-react` into another (`vite.config.ts`).
