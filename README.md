# All Things Water 💧

A standalone e-commerce storefront for **All Things Water** — premium bottled water,
coolers, dispensers and accessories, delivered across South Africa.

This app was forked and enhanced from the parent `water-filter-company` project and lives
on its own branch as an independent application.

> ## ⛔ DO NOT MERGE INTO `master`
> This branch (`all-things-water`) is a **standalone application** and is intentionally
> kept separate from the main project. It must **never** be merged into `master` or the
> main branch. See [`DO_NOT_MERGE.md`](./DO_NOT_MERGE.md).

---

## Tech stack

- **React 18** + **TypeScript**
- **Vite 5** for dev/build
- **Tailwind CSS 3** (with class-based dark mode)
- **React Router 6** for routing
- **lucide-react** for icons
- Cart & theme state via React Context (persisted to `localStorage`)

## Features

- 🛍️ Full catalog built from the real product/pricing sheet (ZAR pricing)
- 🔎 Search, category filter (URL-synced) and sorting
- 🛒 Persistent cart with stock-aware quantity limits
- 🧾 Multi-section checkout with validation and an order-confirmation flow
- 📦 Stock badges (in stock / low stock / sold out) driven by inventory data
- 🚚 Free-delivery threshold logic
- 🌗 Light/dark mode with system preference detection
- ♿ Accessible controls, keyboard focus states, semantic markup
- 📱 Fully responsive + installable PWA manifest
- ⚡ Code-split vendor chunks, lazy-loaded images, per-page SEO meta

## Getting started

```bash
cd all-things-water
npm install
npm run dev      # http://localhost:5180
```

### Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `npm run dev`       | Start the Vite dev server            |
| `npm run build`     | Type-check and build for production   |
| `npm run preview`   | Preview the production build          |
| `npm run lint`      | Lint the source                      |
| `npm run typecheck` | Type-check without emitting          |

## Product data

The catalog in `src/data/products.ts` is derived from the company's *Item Pricing* sheet:

| Product                         | Category      | Price (ZAR) |
| ------------------------------- | ------------- | ----------- |
| Hot & Cold Water Cooler YLR-805LB | Coolers     | R2 645      |
| Counter Top Water Cooler YLR 95TB | Coolers     | R1 800      |
| 18.9L Water Dispenser Bottle      | Dispensers  | R150        |
| Caps for 5-Gallon Bottle          | Accessories | R10         |
| Monate Water 500ml (case of 24)   | Bottled     | R175        |
| Voss Original 800ml (case of 12)  | Bottled     | R1 500      |
| Aquafria Sparkling 500ml (×24)    | Bottled     | R120        |
| Aquafria Still 500ml (×24)        | Bottled     | R120        |

Prices and stock levels can be adjusted directly in `src/data/products.ts`.
