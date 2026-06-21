# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the Vite React frontend. Use `src/pages/` for route-level screens, `src/components/` for shared UI, `src/components/admin/` for admin-only views, `src/context/` for React context state, `src/lib/` for utilities and integrations, and `src/data/` for catalog data. Static assets live in `public/` and product images in `src/assets/products/`. Supabase backend work is split between SQL migrations in `supabase/migrations/` and Edge Functions in `supabase/functions/`.

## Build, Test, and Development Commands
Run `npm install` once, then:

- `npm run dev` starts the local Vite server on `http://localhost:5180`.
- `npm run build` runs TypeScript build checks and creates a production bundle.
- `npm run preview` serves the built app locally.
- `npm run lint` runs ESLint for the frontend codebase.
- `npm run test`, `npm run test:watch`, and `npm run test:coverage` run Vitest in CI, watch, and coverage modes.
- `npm run typecheck` runs strict TypeScript checks without emitting files.
- `npm run deno:check` and `npm run deno:test` validate Supabase Edge Functions.

## Coding Style & Naming Conventions
This project uses TypeScript with strict compiler settings, React 18, and Tailwind CSS. Follow the existing style: 2-space indentation, double quotes, and semicolons. Use PascalCase for components and page files (`ProductCard.tsx`), camelCase for utilities (`adminAudit.ts`), and colocated `*.test.ts` or `*.test.tsx` files for tests. Prefer the `@/` alias for imports from `src/`.

## Testing Guidelines
Vitest runs in `jsdom` with Testing Library setup from `src/test/setup.ts`. Frontend tests should cover behavior, not implementation details, and use the existing naming pattern like `CartContext.test.tsx` or `format.test.ts`. Add or update tests whenever routing, cart logic, inventory behavior, validation, or admin auth changes. Use `npm run test:coverage` before larger merges.

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit prefixes such as `feat:`, `fix:`, and `test:`. Keep subjects short and imperative. PRs should describe user-visible changes, note any Supabase migration or env changes, and include screenshots for UI updates. Link related issues when available. This branch is a standalone app: do not merge it into `master`.

## Security & Configuration Tips
Copy values from `.env.example` and keep service-role, PayFast, and Resend secrets out of the browser. Public values must use the `VITE_` prefix; server-only secrets belong in Supabase Edge Function secrets.
