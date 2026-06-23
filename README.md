# Nabi · Insurance Registry Admin Tool

An internal tool for the Nabi ops team to answer one question fast: **given a patient's insurance, can Nabi see them?** It checks eligibility against a registry of rules, shows what Nabi covers at a glance, and lets non-technical staff manage and correct the underlying rules.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase**.

## Features

- **Eligibility Checker** (`/check`) — payer + plan type + plan structure + state → a clear decision (Nabi Guarantee / needs referral / not eligible / needs research) plus the four outcome fields, with the matching rules and a "this looks wrong" path to fix them.
- **Coverage Overview** (`/coverage`) — a Payer × Plan Structure matrix for a chosen state/plan type, computed live by the eligibility engine.
- **Registry Rules** (`/rules`) — searchable/filterable/sortable table; create, edit (semantic form **or** raw JSON, with a preview/verify step), and delete with confirmation.
- **Correct wrong results** — from a check result, jump straight to the rule(s) that drove it and fix them.

## Eligibility logic

The engine (`lib/eligibility/engine.ts`) is pure and unit-tested, implementing the Registry SOP in three stages:

1. **Match** — rules where `payer_group`, `plan_type`, `plan_structure` equal the query or `*`, and `service_state` contains the state or is `*`.
2. **Aggregate** — for each outcome column, take the highest-priority value across all matching rules (e.g. `serviceable: No > Needs Review > Yes > *`). No match → `Needs Review`.
3. **Decide** — derive the Nabi Guarantee outcome from the aggregated values.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key
npm run dev                  # http://localhost:3000
```

Without Supabase env vars the app runs against an in-memory seed of `registry.json`, so it works out of the box.

### Supabase

1. In the Supabase SQL Editor, run [`supabase/setup.sql`](supabase/setup.sql) — creates the `rules` + `audit_log` tables, RLS policy, and seeds all rules.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. (Re)seed any time with `npm run seed`.

> The RLS policy grants the publishable key full access — fine for an internal tool; use real auth + per-role policies for production.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Engine unit tests (Vitest) |
| `npm run seed` | Seed Supabase from `registry.json` |
| `npm run lint` | ESLint |

## Layout

```
app/            routes: /check, /coverage, /rules, /rules/new, /rules/[id]  + server actions
components/     ui primitives, app shell, feature components, brand mark
lib/eligibility match → aggregate → decide engine, types, constants, tests
lib/rules       Supabase repository (+ local fallback), zod validation
lib/supabase    server client
supabase/       schema migration + one-paste setup.sql
```

## Design

Brand tokens (Nabi Visual Identity): primary blue `#3843d0`, secondary `#8ea1ff`, filler `#d1d9ff`, cream `#fdf8f2`, near-black `#0a0a0a`, accent green/orange/blue/pink/yellow. Headlines use a Gilroy stand-in (Poppins via `next/font` — swap to local Gilroy woff2s in `app/layout.tsx`); body uses Inter.
