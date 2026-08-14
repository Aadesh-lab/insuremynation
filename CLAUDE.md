# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Layout

Two directories, **one** deployable.

| path | what |
| --- | --- |
| `frontend/` | the React site (Vite + React 18 + React Router 6 + Framer Motion) |
| `backend/` | Go service: a secure proxy for the imagine.bo RAG chatbot, which also serves the built site |

This file is the **only** `CLAUDE.md` in the repo, and `README.md`, `.gitignore` and
`.gitattributes` are likewise single and at the root. Do not re-add per-directory copies.
`frontend/` used to carry its own `CLAUDE.md` and `README.md`; both were removed and that
removal is pushed, so a pull will not bring them back. If upstream ever re-adds one, fold
its content in here and delete it again rather than keeping two.

The `Dockerfile` and `railway.toml` are at the **repo root**, not in `backend/`, because
the build needs both directories: it builds the site with npm, embeds the output into the
Go binary via `//go:embed` (`backend/internal/fs.go`), and ships one container. On Railway
leave the service's Root Directory empty so the build context is the repo root.

Deployed at https://insuremynation-production.up.railway.app.

Because the site and the API share an origin, the chat widget's `baseUrl` is just
`window.location.origin` — no CORS, and no build-time URL to keep in sync.

Everything here is on GitHub, `backend/` and the deploy files included. Upstream authors
the site itself, so when pulling expect it to own `frontend/src/pages`,
`frontend/src/data`, `frontend/src/styles` and `frontend/public`. The chat is ours and
lives in `frontend/src/components/chat/`; `frontend/index.html` is byte-identical to
upstream, and the only other local frontend edits are the `<ChatWidget/>` mount in
`App.jsx` and the `/v1` dev proxy in `vite.config.js`.

## Commands

All `npm` commands run from `frontend/`; all `go` commands from `backend/`.

```bash
npm run dev              # Vite dev server on http://localhost:5173
npm run build            # production build into frontend/dist/
npm run preview          # serve the production build
npm run images           # regenerate public/assets/ from the design handoff bundle
node scripts/export-kb.mjs   # regenerate the chatbot knowledge-base corpus

go build ./... && go vet ./... && go test ./...
```

There is no lint or test setup for the frontend; verification there is visual. The backend
has all three.

## The frontend

A pixel-exact React port of the InsureNation design handoff. The prime directive: **the
visual design is reproduced exactly** — no colour, image, copy or spacing value may drift
from the handoff. Preserve this when editing.

### Styling model (the non-obvious part)

The design prototype sizes everything with inline styles against a 1728px canvas and
reshapes it through `[data-r="..."]` media queries. That structure is kept intact:

- **Element styles are inline in JSX**, matching the source design values one-for-one. Do
  not extract them to CSS classes.
- **All responsive behaviour lives in `src/styles/global.css`**, as `@media` blocks
  targeting `data-r` attribute names, reproduced verbatim from the design.
- All pages share one CSS bundle, and several `data-r` names mean **different things per
  page** (`badge`, `srow`, `stitle`, `cimg`, `cgrid`). Page-specific media-query blocks are
  therefore scoped by a root class on each page: `.p-landing`, `.p-about`, `.p-sub`, plus
  `.p-sub[data-product="health"]` and `.p-sub[data-page="contact"]`. When adding a `data-r`
  name, check `global.css` for collisions with other pages.
- `src/styles/components.css` holds hover/focus states the prototype expressed inline.

### Routing and data

- `src/App.jsx` defines all routes. The six insurance pages (`/health-insurance`,
  `/life-insurance`, …) are one component, `src/pages/InsurancePage.jsx`, driven by
  per-product config in `src/data/products.js`. The `key={product.slug}` on the element
  (not just the Route) is load-bearing — without it React reuses the instance across
  product navigations, breaking scroll reveals and leaking form state.
- `src/data/site.js` holds shared constants: brand colours (`BLUE`, `DEEP`, `RED`), contact
  details, nav links, partner list. Use these instead of hard-coding.

### Shared components

- `src/components/Primitives.jsx` — typography/layout primitives (`Eyebrow`,
  `SplitHeading`, `Body`, `Field`, …) used on every page.
- `src/components/Reveal.jsx` — scroll-triggered entrance animation primitives. All motion
  uses the design's easing `cubic-bezier(0.22, 1, 0.36, 1)` (exported as `EASE`); do not
  introduce other easings. Reveals arm 400px below the fold so content never appears blank
  while being read; stagger/duration ceilings are enforced inside the primitives.
  `prefers-reduced-motion` disables all entrance animation. Animated elements must settle
  at exactly the position/scale/colour the design specifies.

### Images

- `public/assets/` is generated output (WebP + SVG icons) — regenerate via `npm run images`
  rather than editing files by hand.
- The handoff's hero and cover-art photos carried a blue gradient-map treatment. These have
  since been **replaced with natural photography, so no image in `public/assets/` is
  duotoned.** `scripts/blue-duotone-lut.json` is that treatment recovered from the handoff
  and `duotone: true` in `scripts/convert-images.mjs` still applies it, but no entry sets
  the flag — both are kept only in case a treated image has to be rebuilt from raw source.
- The natural replacements were encoded from stock PNGs no longer in the tree, at the pixel
  dimensions of the duotoned files they replaced, so framing matches. They are lossy WebP
  (q90) rather than the lossless q100 the rest of `public/assets/` uses, and `npm run
  images` will not reproduce them.

## The chat backend

It exists for exactly one reason: **the RAG API key must never reach the browser.** Two
things follow that are easy to break.

**The routes are not ours to name.** The client is our own React panel in
`frontend/src/components/chat/`, but the paths are still the upstream's — `/v1/kb`,
`/v1/sessions`, `/v1/sessions/:id`, `/v1/query` — because the service was built against the
hosted imagine.bo widget and mirroring them costs nothing. Two shapes are load-bearing
regardless of client: `session_id` (never `id`), and an *object* with `messages` from
`/v1/sessions/:id` (the upstream serves that transcript from a *different* path,
`/history`). Unlike the hosted widget, our panel *does* read error bodies, so the backend's
wording for a rate limit or an outage reaches the visitor instead of "Something went wrong."

**It is not a transparent proxy, in either direction.** `kb_id`, `system_prompt`, `top_k`
and `temperature` are set server-side so a visitor cannot retarget a query;
`chunk_text`/`file_id` are stripped from sources on both the plain and streaming paths; and
the upstream's tenant-scoped `/v1/kb` and `/v1/sessions` are narrowed to one KB and to the
caller's own sessions. Remove any of those and a leak turns back on.

That includes the per-page behaviour. The browser sends `product` — an **id**, never prompt
text — and `buildSystemPrompt` looks it up in `productPrompts`; an unrecognised value gets
the base prompt. **The map lookup is the allowlist.** Concatenate anything from the request
into `system_prompt` and every visitor can rewrite the assistant. `chat_test.go` covers it.
The funnels those prompts drive, and the flow end to end, are in
[user_flow_insurance.md](user_flow_insurance.md) — read that before changing the questions,
their order, or the chip wording in `frontend/src/components/chat/journeys.js`.

Other load-bearing details:

- The per-IP caps in `internal/services/chat.go` are the only abuse control on a public
  endpoint, and they key on `c.ClientIP()`. That is why `server.go` disables gin's default
  "trust `X-Forwarded-For` from anyone" and reads `CLIENT_IP_HEADER` instead — which **must**
  name a header the edge *overwrites* (`X-Real-Ip` on Railway). Naming one the edge does not
  set is worse than leaving it blank: every caller can then claim any IP.
- `serveSPA` answers `/api/*` and `/v1/*` misses with JSON 404 rather than the SPA shell,
  for the widget reason above.
- Only a placeholder `backend/internal/dist/index.html` is committed; the Docker build
  overlays the real Vite output. Do not commit a real built `index.html` there — it names
  hashed bundles that aren't committed.
- The knowledge base is generated from the site's own copy by
  `frontend/scripts/export-kb.mjs`. Re-run it and re-ingest after copy edits. The
  assistant's *identity* deliberately lives in the system prompt, not the corpus, because
  retrieval is semantic and a question like "what are you" does not reliably retrieve. The
  same goes for the qualification funnels: none of what they ask about — family floaters,
  lakh/crore, NCB, Institute Cargo Clauses — is in the corpus, which is why the chips send
  *answers* rather than questions.
- There is **no lead capture**. That is why the prompt forbids asking a visitor for their
  name, phone or email: a number typed into the chat is read by nobody, so asking for one
  promises a call back that will not happen. Lift that ban only together with the endpoint
  that catches the answer — specified in [user_flow_insurance.md](user_flow_insurance.md).

## Known content bug

`frontend/src/data/site.js` and `frontend/src/pages/Contact.jsx` state **different office
addresses** (Arunachal Building / Barakhamba Road vs Ambadeep Building / Kasturba Gandhi
Marg), so the live site shows both. The knowledge base uses the Contact page's, which has
two corroborating references. `site.js` still needs fixing.
