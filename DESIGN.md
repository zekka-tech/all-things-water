---
name: all-things-water-design-system
version: 2.0.0
brand: All Things Water
market: South Africa (ZAR)
---

# All Things Water — Design System

Agent-readable design specification (Google Stitch DESIGN.md format).
Apply these tokens and rules consistently across every component and page.

---

## Brand Identity

**Personality:** Clean · Premium · Refreshing · Trustworthy
**Visual language:** The purity of water — white space, crystalline blues, confident typography, crisp edges.
**Voice:** Direct, welcoming, South African.

---

## Color Tokens

### Brand (Blue — water)
| Token       | Hex       | Usage                                    |
|-------------|-----------|------------------------------------------|
| brand-50    | #eff9ff   | Tinted surfaces, hero/section backgrounds |
| brand-100   | #dff2ff   | Subtle highlights, icon backgrounds       |
| brand-200   | #b8e7ff   | Borders on tinted surfaces               |
| brand-300   | #78d4ff   | Decorative accents                       |
| brand-400   | #32bdff   | Dark mode links, icon fills              |
| brand-500   | #06a3f0   | Gradient start, active icons             |
| brand-600   | #0082cd   | Primary buttons, links, active states    |
| brand-700   | #0067a6   | Button hover, pressed                    |
| brand-800   | #055789   | Dark text on light surfaces              |
| brand-950   | #072e4b   | Dark hero backgrounds                    |

### Ink (Neutral)
| Token   | Hex       | Usage                              |
|---------|-----------|------------------------------------|
| ink-50  | #f6f7f9   | Page bg, footer bg, subtle fills   |
| ink-100 | #eceef2   | Hover fills                        |
| ink-200 | #d5dae2   | Card borders, dividers             |
| ink-400 | #8595aa   | Placeholder text, muted icons      |
| ink-500 | #66778f   | Muted / secondary text             |
| ink-600 | #516076   | Body text (secondary)              |
| ink-700 | #424e60   | Body text (primary)                |
| ink-900 | #1f2630   | Headings (light mode)              |
| ink-950 | #13181f   | Page background (dark mode)        |

### Semantic
| State   | Color      | Usage                          |
|---------|------------|--------------------------------|
| success | emerald-500/600 | In-stock, confirmed, free shipping |
| warning | amber-500/700   | Low stock, caution            |
| error   | red-500/600     | Errors, out-of-stock          |
| info    | brand-500/600   | Informational callouts        |

---

## Typography

### Font Stack
- **Display / Headings:** `Plus Jakarta Sans` — h1, h2, large stats, hero text
- **Body / UI:** `Inter` — body copy, buttons, labels, form fields

### Scale
| Role        | Tailwind                        | Size | Weight | Use                     |
|-------------|----------------------------------|------|--------|-------------------------|
| Display XL  | `font-display text-5xl font-extrabold` | 48px | 800 | Hero h1               |
| Display L   | `font-display text-4xl font-extrabold` | 36px | 800 | Page h1, About hero   |
| Heading XL  | `font-display text-3xl font-bold`      | 30px | 700 | Section h2            |
| Heading L   | `font-display text-2xl font-bold`      | 24px | 700 | Card headings, stats  |
| Heading M   | `text-xl font-semibold`                | 20px | 600 | Sub-sections, aside h |
| Body L      | `text-lg`                              | 18px | 400 | Lead paragraph        |
| Body        | `text-base`                            | 16px | 400 | Body copy             |
| Body S      | `text-sm`                              | 14px | 400 | Secondary text        |
| Caption     | `text-xs font-semibold`                | 12px | 600 | Badges, labels        |

### Gradient Text (key headline accent)
Apply `gradient-text` on the brand word in hero headlines: wraps text in
`bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent`.

---

## Spacing

Base unit: 4 px (Tailwind default). Use multiples of the base.

| Scale | px  | Common use                     |
|-------|-----|--------------------------------|
| 1     | 4   | Micro gaps, icon nudges        |
| 2     | 8   | Button icon gaps               |
| 3     | 12  | Badge padding                  |
| 4     | 16  | Card padding (sm)              |
| 5     | 20  | Icon wrap size                 |
| 6     | 24  | Card padding (default)         |
| 8     | 32  | Section inner padding          |
| 10    | 40  | Component vertical rhythm      |
| 12    | 48  | Section vertical rhythm        |
| 16    | 64  | Page section padding           |
| 20    | 80  | Hero top/bottom padding        |
| 24    | 96  | Large hero (desktop)           |

---

## Elevation

| Level | Classes              | Use                                 |
|-------|----------------------|-------------------------------------|
| 0     | —                    | Flat, inline elements               |
| 1     | `shadow-sm`          | Cards, inputs at rest               |
| 2     | `shadow-md`          | Hovered cards, dropdowns            |
| 3     | `shadow-lg`          | Modals, popovers                    |
| glow  | `shadow-glow-brand`  | Primary CTA buttons, hero highlights|

---

## Border Radius

| Token        | Value  | Use                             |
|--------------|--------|---------------------------------|
| rounded-lg   | 8 px   | Small components, tags          |
| rounded-xl   | 12 px  | Buttons, inputs, icon wraps     |
| rounded-2xl  | 16 px  | Cards                           |
| rounded-3xl  | 24 px  | CTA banners, hero panels        |
| rounded-full | 9999px | Badges, avatars, filter chips   |

---

## Component Specifications

### Navbar
- Height: `h-16` (64 px)
- Background: `bg-white/90 backdrop-blur-md` (light) / `bg-ink-950/90 backdrop-blur-md` (dark)
- Border: bottom `border-ink-200/70` / `border-ink-800/70`
- Logo icon: `bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl shadow-sm`
- Active link: brand-colored text + 2 px bottom accent line centered under label
- Cart badge: `bg-brand-600 text-white rounded-full`
- Sticky, `z-40`

### Button — Primary (`btn-primary`)
- Background: `bg-brand-600`
- Hover: `bg-brand-700 shadow-glow-brand`
- Text: white, `font-semibold text-sm`
- Padding: `px-4 py-2.5` default, `px-6 py-3` large
- Radius: `rounded-xl`
- Active: `scale-[0.98]`
- Focus: `ring-2 ring-brand-500 ring-offset-2`

### Button — Ghost (`btn-ghost`)
- Background: transparent
- Hover: `bg-ink-100` (light) / `bg-ink-800` (dark)

### Button — Outline (`btn-outline`)
- Border: `border-ink-200` / `border-ink-700`
- Hover: `border-brand-400 text-brand-700`

### Card (`.card`)
- Background: white / `ink-900`
- Border: `ink-200/70` / `ink-800`
- Radius: `rounded-2xl`
- Shadow: `shadow-sm`
- Hover transform: `-translate-y-1 shadow-md`

### Input (`.input`)
- Border: `ink-200` / `ink-700`
- Background: white / `ink-900`
- Radius: `rounded-xl`
- Focus: `border-brand-400 ring-2 ring-brand-200`
- Error: `border-red-400 ring-red-200`

### Badge (`.badge`)
- Radius: `rounded-full`
- Padding: `px-2.5 py-0.5`
- Font: `text-xs font-semibold`
- Color combos: brand (info), emerald (success), amber (warning), ink (neutral)

### Icon Wrap (`.icon-wrap`)
- Size: `h-11 w-11` default
- Background: `bg-brand-100 dark:bg-brand-500/15`
- Color: `text-brand-600 dark:text-brand-400`
- Radius: `rounded-xl`
- Use `grid place-items-center`

### ProductCard
- Image area: square aspect-ratio, `bg-gradient-to-b from-brand-50 to-white dark:from-ink-800 dark:to-ink-900`
- Image padding: `p-6`; image `object-contain`; hover `scale-105` (500 ms)
- Stock badge: top-left absolute
- Body: `p-4`, flex-col
- Category: `text-xs font-semibold uppercase tracking-wide text-brand-600`
- Name: `font-semibold leading-snug`
- Tagline: `text-sm text-ink-500 line-clamp-2`
- Price: `text-lg font-bold`
- CTA: `btn-primary text-xs px-3 py-2`
- Card hover: `-translate-y-1 shadow-md`

### Footer
- Background: `bg-ink-50 dark:bg-ink-950`
- Top accent: 4 px brand-gradient strip
- Grid: logo col + 3 link columns (4 col desktop, 2 col tablet, stack mobile)
- Newsletter: separate row above the grid columns
- Bottom bar: copyright centered, `text-xs text-ink-400`

---

## Animations

| Name      | Duration | Easing          | Use                          |
|-----------|----------|-----------------|------------------------------|
| fade-in   | 0.5 s    | ease-out        | Entry animation, hero        |
| ripple    | 2.4 s    | ease-out ∞      | Hero bg decoration           |
| slide-up  | 0.3 s    | ease-out        | Mobile menu, toasts          |
| scale-in  | 0.2 s    | ease-out        | Badge appear, modal entry    |
| shimmer   | 1.5 s    | ease-in-out ∞   | Skeleton loading states      |

---

## Dark Mode

Toggle via `dark` class on `<html>` (ThemeContext). Key inversions:

| Surface        | Light         | Dark           |
|----------------|---------------|----------------|
| Page bg        | white         | ink-950        |
| Card bg        | white         | ink-900        |
| Card border    | ink-200/70    | ink-800        |
| Tinted surface | brand-50      | ink-800        |
| Body text      | ink-900       | ink-100        |
| Muted text     | ink-500       | ink-400        |
| Primary icon   | brand-600     | brand-400      |
| Input bg       | white         | ink-900        |

---

## Layout

- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (`.container-page`)
- Responsive breakpoints: `sm` 640 px, `md` 768 px, `lg` 1024 px, `xl` 1280 px
- Section vertical rhythm: `py-12` default, `py-16` hero/CTA sections
- Grid gaps: `gap-4` tight, `gap-5` cards, `gap-8` layout columns

---

## Delivery & Pricing Rules (Checkout)

- Free delivery threshold: **R 500**
- Delivery fee (below threshold): **R 75**
- Show free-shipping progress bar in cart when order < R 500
- Currency format: South African Rand via `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })`
