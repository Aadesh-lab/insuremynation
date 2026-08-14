# InsureMyNation

The InsureNation insurance site. Two directories, **one** deployable: the React site is
built and embedded into the Go binary, which serves it. The chat assistant is imagine.bo's,
called direct from the browser; the panel is ours.

Live at **https://insuremynation.imaginebo.app** — the canonical host, and the only one the
chat works on. See *It only works on an allowlisted origin* below.

```
frontend/   React site (Vite + React 18 + React Router 6 + Framer Motion) + the chat panel
backend/    Go service — static host for the built site, plus a healthcheck
Dockerfile  builds both, at the repo root because it needs both directories
```

This is the only `README.md` in the repo; `CLAUDE.md`, `.gitignore` and `.gitattributes`
are likewise single and at the root. `frontend/` used to carry its own copies of the first
two; both were removed and that removal is pushed, so a pull will not bring them back.

## Running locally

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
cd backend  && go run ./cmd/server             # http://localhost:8080
```

The Go service is only needed to check the embedded build; `npm run dev` alone covers
frontend work. Neither gives you a working chat locally — `localhost:5173` is not on
imagine.bo's origin allowlist, so the panel reports the assistant as unavailable.

| script (in `frontend/`) | what it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run images` | regenerate `public/assets/` from the handoff bundle |
| `node scripts/export-kb.mjs` | regenerate the chatbot's knowledge-base corpus |
| `node scripts/check-split-options.mjs` | chat: the reply-to-chips parser |
| `node scripts/check-page-context.mjs` | chat: first-seen ad attribution |

In `backend/`: `go build ./...`, `go vet ./...`, `go test ./...`.

# The frontend

React port of the InsureNation design handoff. The visual design is reproduced exactly: no
colour, image, copy or spacing value was changed.

## Routes

| path | source design file |
| --- | --- |
| `/` | InsureNation Landing |
| `/about` | InsureNation About |
| `/career` | InsureNation Career |
| `/claim-support` | InsureNation Claim Support |
| `/contact` | InsureNation Contact |
| `/health-insurance` | InsureNation Health Insurance |
| `/life-insurance` | InsureNation Life Insurance |
| `/car-insurance` | InsureNation Car Insurance |
| `/bike-insurance` | InsureNation Bike Insurance |
| `/travel-insurance` | InsureNation Travel Insurance |
| `/marine-insurance` | InsureNation Marine Insurance |

## Structure

```
public/assets/        WebP artwork + the SVG icons
scripts/
  convert-images.mjs  handoff PNG/JPG -> WebP
  export-kb.mjs       site copy -> chatbot knowledge-base corpus
src/
  components/         Nav, Footer, Partners, TalkToExperts, Icons,
                      Primitives (Eyebrow/SplitHeading/Body/Field/...),
                      Reveal (scroll-animation primitives)
  data/
    site.js           shared contact details, nav + partner lists
    products.js       per-product copy for the six insurance pages
  pages/              Landing, About, Career, ClaimSupport, Contact,
                      InsurancePage
  styles/
    global.css        base rules + every responsive breakpoint from the design
    components.css    hover/focus states the prototype expressed inline
```

## How the design is preserved

The prototype sizes everything with inline styles against a 1728px canvas, then reshapes it
through `[data-r="..."]` media queries. That structure is kept:

- Element styles stay inline, matching the source values one-for-one.
- Every `@media` block is reproduced verbatim in `src/styles/global.css`.
- Because all pages share one CSS bundle and several `data-r` names mean different things
  per page (`badge`, `srow`, `stitle`, `cimg`, `cgrid`), page-specific blocks are scoped by
  a root class — `.p-landing`, `.p-about`, `.p-sub` — plus two narrower hooks:
  `.p-sub[data-product="health"]` for the Health cover artwork and
  `.p-sub[data-page="contact"]` for the details grid.

## Images

`npm run images` converts the raster assets with sharp and copies the SVG icons unchanged.

The handoff's hero and cover-art photos carried a blue gradient-map treatment. Those have
since been **replaced with natural photography, so no image in `public/assets/` is
duotoned.** `scripts/blue-duotone-lut.json` is that treatment recovered from the handoff,
and `duotone: true` in `scripts/convert-images.mjs` still applies it, but no entry sets the
flag — both are kept only in case a treated image has to be rebuilt from raw source.

The natural replacements were encoded from stock PNGs that are no longer in the tree, at
the pixel dimensions of the duotoned files they replaced, so framing matches. They are
lossy WebP (q90) rather than the lossless q100 the rest of `public/assets/` uses, and
`npm run images` will not reproduce them.

## Animation

Interactions carried over from the prototype: the hero photo collage crossfade and headline
rotation, the services and building-block hover rows, the testimonial rail, the nav
dropdown, and the form submit-state transitions.

The insurance pages add scroll-triggered motion via Framer Motion
(`src/components/Reveal.jsx`), reusing the design's own easing curve
`cubic-bezier(0.22, 1, 0.36, 1)`. Every animated element settles at exactly the position,
scale and colour the design specifies, so the page at rest is unchanged.
`prefers-reduced-motion` collapses all of it.

# The chat

The assistant is imagine.bo's. The **UI** is ours, in
`frontend/src/components/chat/`; it talks to `orchestrator.imagine.bo` direct from the
browser against the contract in [HEADLESS_CHAT_INTEGRATION_v2.md](HEADLESS_CHAT_INTEGRATION_v2.md).
They own the funnel questions, the system prompt and the lead capture — their assistant
asks the visitor for name, mobile and email itself and writes the lead to their CRM.

There is no chat API on this service. There used to be: a proxy at `/v1/*` holding a RAG
API key, with our own qualification funnel and per-product prompts. The headless
integration carries **no key**, so the one reason that backend existed no longer applied
and it was deleted. `git log` has it.

| file | job |
| --- | --- |
| `useHeadlessChat.js` | the client: sessions, one turn at a time, errors, terminal state |
| `pageContext.js` | `context_variables` — which page, and first-seen ad attribution |
| `splitOptions.js` | the `- ` lines of a reply become tappable chips |
| `ChatPanel.jsx`, `Message.jsx`, `ChatWidget.jsx` | the panel, bubbles and launcher |

Two checks cover the parts that fail *silently* — a broken parser just stops rendering
chips, broken attribution just reports nothing:

```bash
cd frontend
node scripts/check-split-options.mjs
node scripts/check-page-context.mjs
```

### It only works on an allowlisted origin

imagine.bo keeps a list of domains, and every other origin gets
`403 {"detail":"Domain not allowed: …"}`. The panel reports that as "Chat is unavailable on
this page. Please call +91 99101 69789." — correct behaviour, but it means the assistant is
dead anywhere unlisted, with the page otherwise looking fine.

| origin | on the list |
| --- | --- |
| `https://insuremynation.imaginebo.app` | yes — the canonical host |
| `https://insuremynation-production.up.railway.app` | no |
| `http://localhost:5173` | no — so the chat cannot be exercised locally |

Ask them before relying on a new host. Point ads at the canonical domain only.

### Mobile

Below 560px the panel becomes a full-screen sheet (`chat.css`). Four of those rules exist
for reasons a desktop browser will not show you:

- the height is set from `window.visualViewport` in JS, because `inset: 0` is the layout
  viewport and an on-screen keyboard does not shrink it — the composer would end up
  *under* the keyboard. `100dvh` tracks browser chrome, not keyboards.
- the composer is 16px, below which iOS Safari zooms the page on focus and the visitor
  cannot zoom back out.
- the launcher is hidden while the panel is open, or it covers the send button.
- the composer is not auto-focused on touch, or the keyboard hides the question.

# The service

One binary: the built React app is embedded via `//go:embed`
(`backend/internal/fs.go`) and served as a SPA, plus `GET /api/health` for the Railway
healthcheck. Nothing else.

### Build and deploy

The `Dockerfile` and `railway.toml` live at the **repository root**, not in `backend/`,
because the build has to reach both `frontend/` and `backend/`. On Railway leave the
service's Root Directory empty so the build context is the repo root.

The image builds the site (`node:22-alpine`, `npm ci && npm run build`), overlays the
output onto `backend/internal/dist`, then compiles the Go binary with it embedded. Only a
placeholder `backend/internal/dist/index.html` is committed — enough for `//go:embed` to
compile from a clean checkout.

To reproduce locally:

```bash
cd frontend && npm run build
cd ../backend && rm -rf internal/dist && cp -r ../frontend/dist internal/dist
go build -o bin/imagine_backend ./cmd/server && ./bin/imagine_backend
```

For day-to-day frontend work use `npm run dev`. No proxy is needed any more — the chat is
cross-origin by design — but see the allowlist note above: on `localhost:5173` the panel
will report the chat as unavailable.

### Environment

| var | required | notes |
| --- | --- | --- |
| `CANONICAL_HOST` | recommended | hostname to redirect page requests to, e.g. `insuremynation.imaginebo.app`. Unset, the service answers on any host — and the chat only works on one. `/api/` and `/v1/` are never redirected. |
| `PORT` | no | defaults to `8080` (Railway sets it) |
| `ENV` | no | `production` switches gin to release mode |
| `CLIENT_IP_HEADER` | behind a proxy | header naming the real client. **On Railway set `X-Real-Ip`.** |

The `RAG_*` variables are dead — nothing reads them since the proxy was deleted. Remove
them from the Railway service.

`CLIENT_IP_HEADER` still feeds the global rate limiter, and the value must be a header the
edge **overwrites**, not merely one that sounds infrastructural. Naming a header the edge
does not set is worse than leaving this blank: every caller can then supply it and
impersonate any client.

Measured against this Railway deployment:

| header | set by Railway? | forged value |
| --- | --- | --- |
| `X-Real-Ip` | yes | replaced with the true client IP — **safe** |
| `X-Forwarded-For` | yes, real client **first**, edge appended | left entry is caller-controlled |
| `X-Envoy-External-Address` | **no** | accepted verbatim — unsafe despite the name |

Re-run that check on any new platform (send the header a value, see whether it survives)
rather than trusting a name. gin's default of trusting `X-Forwarded-For` from any peer is
disabled in `server.go`: before that fix, 12 forged requests bought 12 fresh quotas.

Variables are read with `os.Getenv`, so setting a missing one and restarting is enough —
there is no `.env` loading and no config struct to extend.

```bash
CANONICAL_HOST= ENV=development go run ./cmd/server
go test ./...
```

### The knowledge base

`frontend/kb-corpus.txt` is generated from the site's own copy by
`frontend/scripts/export-kb.mjs`, so the assistant cannot drift from what the site says.
Re-run it after any copy change:

```bash
cd frontend && node scripts/export-kb.mjs
```

Ingesting it is now imagine.bo's side of the line — ask them to re-ingest, and to confirm
which knowledge base their orchestrator actually answers from.
