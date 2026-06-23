# Brand — Typography

Source of truth for the type system. Figma: **Brand Guidelines (Copy)**, file key
`KifAAAaG4P4NJtXhpaLYoy`, Typography Overview node `45:347`
(`https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=45-347&m=dev`).

## Two families, three roles

- **Gilroy** — the display face. Used for **Titles**, **Labels**, and **Subheadings**.
- **Inter** — the body face. Used for **Paragraphs** (all running/body text).

Gilroy is licensed and not in the repo. Headlines use **Poppins** as a geometric
stand-in via `next/font` (`app/layout.tsx`); swap to local Gilroy woff2s when the
brand files are available — only that one block changes. `--font-display` resolves
to the stand-in, `--font-sans` to Inter.

### Why these features matter (from the Figma overview)

- **Gilroy & Inter pairing** — a distinctive geometric display face over a highly
  legible body face gives each element the right voice.
- **Enhanced readability** — the scale prioritizes legibility across devices and
  platforms for a smooth reading experience.
- **Clean, consistent look** — consistent sizes/weights keep a polished, cohesive
  visual identity. Use the tokens below rather than ad-hoc `text-[…]` sizes.

## The scale

Letter-spacing is shown as the Figma %-of-em value and the `em` it maps to
(`-1%` → `-0.01em`, `6%` → `0.06em`). All Titles render Gilroy **SemiBold 600**
(the per-card "Bold/Medium" labels in Figma are inconsistent template leftovers —
the rendered face is SemiBold). Each row has a self-contained `.type-*` class in
`app/globals.css`.

### Titles — Gilroy / SemiBold 600

| Class | Token | Size / Line height | Tracking |
|---|---|---|---|
| `.type-title-h1` | Title / H1 | 56 / 64 | -1% (-0.01em) |
| `.type-title-h2` | Title / H2 | 48 / 56 | -1% (-0.01em) |
| `.type-title-h3` | Title / H3 | 40 / 48 | -1% (-0.01em) |
| `.type-title-h4` | Title / H4 | 36 / 40 | -0.5% (-0.005em) |
| `.type-title-h5` | Title / H5 | 24 / 32 | 0% |
| `.type-title-h6` | Title / H6 | 20 / 28 | 0% |

### Labels — Gilroy (SemiBold 600, except sm-light = Medium 500)

| Class | Token | Size / Line height | Tracking | Weight |
|---|---|---|---|---|
| `.type-label-xl` | Label / X-Large | 24 / 32 | -1.5% (-0.015em) | 600 |
| `.type-label-lg` | Label / Large | 18 / 24 | -1.5% (-0.015em) | 600 |
| `.type-label-md` | Label / Medium | 16 / 24 | -1.1% (-0.011em) | 600 |
| `.type-label-sm` | Label / Small | 14 / 20 | -0.6% (-0.006em) | 600 |
| `.type-label-sm-light` | Label / Small-Light | 16 / 20 | -0.6% (-0.006em) | 500 |
| `.type-label-xs` | Label / X-Small | 12 / 16 | 0% | 600 |

### Paragraphs — Inter (body)

| Class | Token | Size / Line height | Tracking | Weight |
|---|---|---|---|---|
| `.type-body-xl` | Paragraph / X-Large | 24 / 32 | -1.5% (-0.015em) | 400 |
| `.type-body-lg` | Paragraph / Large | 18 / 26 | -1.5% (-0.015em) | 400 |
| `.type-body-lg-medium` | Paragraph / Large-Medium | 18 / 24 | -1.5% (-0.015em) | 500 |
| `.type-body-md` | Paragraph / Medium | 16 / 24 | -1.1% (-0.011em) | 400 |
| `.type-body-sm` | Paragraph / Small | 14 / 20 | -0.6% (-0.006em) | 400 |
| `.type-body-xs` | Paragraph / X-Small | 12 / 16 | 0% | 400 |

### Subheadings — Gilroy / SemiBold 600, UPPERCASE, wide tracking

The `.type-subhead-*` classes apply `text-transform: uppercase` themselves.

| Class | Token | Size / Line height | Tracking |
|---|---|---|---|
| `.type-subhead-md` | Subheading / Medium | 16 / 24 | +6% (0.06em) |
| `.type-subhead-sm` | Subheading / Small | 14 / 20 | +6% (0.06em) |
| `.type-subhead-xs` | Subheading / X-Small | 12 / 16 | +4% (0.04em) |
| `.type-subhead-2xs` | Subheading / 2X-Small | 11 / 12 | +2% (0.02em) |

## Usage

Apply one `.type-*` class per text element; colour stays separate
(`text-ink`, `text-muted`, `text-subtle`, …). Examples:

- Page title → `type-title-h5` (or `h4`/`h3` for hero headings)
- Page subtitle / running copy → `type-body-sm` / `type-body-md`
- Eyebrow / section label / table header → `type-subhead-xs`
- Button / form label → `type-label-sm`
- Badge / metadata chip → `type-label-xs`

Prefer these over arbitrary `text-[13px]` / `text-2xl` utilities so the UI stays
locked to the brand scale.
