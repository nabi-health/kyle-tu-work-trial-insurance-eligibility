# Brand — Figma references

Source of truth for the visual identity. Working file (dev-seat enabled):
**Brand Guidelines (Copy)** — file key `KifAAAaG4P4NJtXhpaLYoy`
`https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-`

(The original referenced in the project spec is file key `eVh5ooFxrAeSMNkPqWLDcD`.)

Read with the Figma MCP `get_design_context` / `get_variable_defs` using a specific `node-id` (the page links below). Whole-file metadata calls tend to time out — always target a node.

## Pages

| Page | Node | Link |
|---|---|---|
| Colors — overview | `1:731` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-731&m=dev |
| Colors — primary | `1:769` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-769&m=dev |
| Colors — accent | `1:798` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-798&m=dev |
| Colors — don'ts | `1:828` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-828&m=dev |
| Typography — primary | `1:904` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-904&m=dev |
| Typography — overview (full scale) | `45:347` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=45-347&m=dev |
| Logo — primary | `1:377` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-377&m=dev |
| Logo — primary negative | `1:412` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-412&m=dev |
| Logo — wordmark | `1:619` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-619&m=dev |
| Logo — wordmark clear space | `1:505` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-505&m=dev |
| Logo — wordmark logo clearspace | `1:666` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-666&m=dev |
| Logo — icon mark | `1:643` | https://www.figma.com/design/KifAAAaG4P4NJtXhpaLYoy/Brand-Guidelines--Copy-?node-id=1-643&m=dev |

## Tokens extracted (applied in `app/globals.css`)

**Primary:** Primary Blue `#3843d0` · Secondary Blue `#8ea1ff` · Filler Blue `#d1d9ff` · Cream `#fdf8f2` · neutral/950 `#0a0a0a` · white `#ffffff`

**Accent:** Green `#33c759` · Orange `#fe9900` · Yellow `#fece00` · Blue `#00a3fe` · Pink `#fe76b8`

**Type:** Gilroy display (Titles/Labels/Subheadings) · Inter body (Paragraphs).
Gilroy is licensed and not in the repo — headlines use **Poppins** as a geometric stand-in via `next/font`; swap to local Gilroy woff2s in `app/layout.tsx` (one block).
Full type scale (sizes, line heights, tracking, weights, and the `.type-*` classes) lives in **[`docs/brand-typography.md`](brand-typography.md)**, sourced from Typography Overview node `45:347`.

**Icon mark:** extracted to `components/brand/NabiMark.tsx` (path from node `1:643`).
