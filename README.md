# InsureMyNation

The InsureNation insurance site and its chat backend. Two directories, **one** deployable:
the React site is built and embedded into the Go binary, which serves it alongside a secure
proxy for the imagine.bo RAG chatbot.

Live at https://insuremynation-production.up.railway.app

```
frontend/   React site (Vite + React 18 + React Router 6 + Framer Motion)
backend/    Go service — RAG proxy + static host for the built site
Dockerfile  builds both, at the repo root because it needs both directories
```

This is the only `README.md` in the repo; `CLAUDE.md`, `.gitignore` and `.gitattributes`
are likewise single and at the root. GitHub tracks `frontend/README.md` and
`frontend/CLAUDE.md`, so a pull will try to restore them — delete them again and fold
anything new into these files.

## Running locally

```bash
cd frontend && npm install && npm run dev      # http://localhost:5173
cd backend  && go run ./cmd/server             # http://localhost:8080
```

Run both together for chat work: Vite proxies `/v1` to `localhost:8080`
(`frontend/vite.config.js`), so the widget is same-origin in dev exactly as it is in
production, and needs no rebuild between edits.

| script (in `frontend/`) | what it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run images` | regenerate `public/assets/` from the handoff bundle |
| `node scripts/export-kb.mjs` | regenerate the chatbot's knowledge-base corpus |

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

# The chat backend

One binary that serves the whole site: the built React app is embedded via
`//go:embed` (see `backend/internal/fs.go`) and served alongside a secure proxy in front of
the imagine.bo RAG API. The proxy exists for one reason: the RAG API key must never
reach the browser.

Because the site and the API share an origin, the widget's `baseUrl` is just
`window.location.origin` — no CORS preflight, and no deploy-time URL to keep in
sync. `frontend/index.html` therefore configures the widget with no `apiKey` and no
`kbId`; both stay server-side.

### Build and deploy

The `Dockerfile` and `railway.toml` live at the **repository root**, not in `backend/`, because the build has to reach both `frontend/` and `backend/`. On Railway leave the
service's Root Directory empty so the build context is the repo root.

The image builds the site (`node:22-alpine`, `npm ci && npm run build`), overlays the
output onto `backend/internal/dist`, then compiles the Go binary with it embedded.
Only a placeholder `backend/internal/dist/index.html` is committed — enough for
`//go:embed` to compile from a clean checkout.

To reproduce locally:

```bash
cd frontend && npm run build
cd ../backend && rm -rf internal/dist && cp -r ../frontend/dist internal/dist
go build -o bin/imagine_backend ./cmd/server && ./bin/imagine_backend
```

For day-to-day frontend work use `npm run dev` instead: Vite proxies `/v1` to
`localhost:8080` (see `frontend/vite.config.js`), so run the Go binary alongside it
and the widget works same-origin without rebuilding.

The only client is the imagine.bo chat widget, which the site loads from
`https://public.assets.imagine.bo/imagine.bo-chat-widget.js`. The widget is
configured with `baseUrl` pointing here and **no `apiKey`**, so it sends no
`Authorization` header — this service adds one. Because the widget derives every
URL from `baseUrl`, the routes below mirror the upstream's own paths rather than
being an API of our own design.

| route | purpose |
| --- | --- |
| `GET /*` | the embedded React site, with SPA fallback for client-side routes |
| `GET /api/health` | Railway healthcheck |
| `GET /v1/kb` | KB auto-discovery — narrowed to the one KB in `RAG_KB_ID` |
| `GET /v1/sessions` | only the sessions this client minted |
| `POST /v1/sessions` | mint a session, bound to this client |
| `GET /v1/sessions/:id` | one session, only for the client that minted it |
| `POST /v1/query` | ask a question; streams when the body sets `stream: true` |

### Environment

Set these on the service (Railway → Variables). Both of the first two are
required: until they are present every chat request returns
`503 {"error":"chatbot not configured"}` — the server still boots and still
serves `/api/health`, so a missing key is visible without taking the site down.

| var | required | notes |
| --- | --- | --- |
| `RAG_API_KEY` | yes | bearer token, `rg-<hex>`. Never logged, never returned. |
| `RAG_KB_ID` | yes | UUID of the knowledge base to answer from |
| `RAG_BASE_URL` | no | defaults to `https://app.imagine.bo` |
| `PORT` | no | defaults to `8080` (Railway sets it) |
| `ENV` | no | `production` switches gin to release mode |
| `CLIENT_IP_HEADER` | behind a proxy | header naming the real client. **On Railway set `X-Real-Ip`.** |

`CLIENT_IP_HEADER` is not optional in practice, because the abuse cap is keyed on the
client's identity — and the value must be a header the edge **overwrites**, not merely
one that sounds infrastructural. Naming a header the edge does not set is worse than
leaving this blank: every caller can then supply it and impersonate any client.

Measured against this Railway deployment:

| header | set by Railway? | forged value |
| --- | --- | --- |
| `X-Real-Ip` | yes | replaced with the true client IP — **safe** |
| `X-Forwarded-For` | yes, real client **first**, edge appended | left entry is caller-controlled |
| `X-Envoy-External-Address` | **no** | accepted verbatim — unsafe despite the name |

Re-run that check on any new platform (send the header a value, see whether it
survives) rather than trusting a name. Unset, the identity falls back to the socket
peer: unforgeable, but on Railway that is a rotating `100.64.0.0/10` internal pool, so
the cap keys on neither the visitor nor a constant. gin's default of trusting
`X-Forwarded-For` from any peer is disabled in `server.go` for the same reason —
verified before the fix that 12 forged requests bought 12 fresh quotas.

They are read with `os.Getenv` at request time, not cached at boot, so setting a
missing var and restarting is enough — there is no `.env` loading and no config
struct to extend.

Local run:

```bash
RAG_API_KEY=rg-... RAG_KB_ID=<uuid> ENV=development go run ./cmd/server
go test ./...
```

### Provisioned resources

The imagine.bo tenant, API key and knowledge base for this site already exist:

| what | value |
| --- | --- |
| tenant | `646bb03e-7541-4a42-92cc-1c7969f73f9f` ("InsureMyNation") |
| `RAG_KB_ID` | `7515c00b-2b43-42b8-b075-92dc1c16a86e` |
| `RAG_API_KEY` | label `insuremynation-site` — the value is shown only at creation; it is in `backend/.env` locally (gitignored) and must be set in Railway by hand |

The KB holds one file, `insuremynation-website.txt`, generated from the site's own
copy by `frontend/scripts/export-kb.mjs`. Re-run that script after any copy change
and re-ingest, so the assistant cannot drift from what the site says:

```bash
cd frontend && node scripts/export-kb.mjs      # writes kb-corpus.txt
# then POST it to https://app.imagine.bo/v1/ingest/text with options.kb_id above
```

**The chatbot needs a plan that includes RAG conversations.** Free and Lite grant
zero, Build 2000, Pro 3500. On a zero-quota plan the upstream answers `/v1/query`
with 402 and this service correctly reports
`429 {"error":"The assistant is busy right now. Please try again later."}` — the
integration is fine, the plan is the blocker.

### What the proxy changes on the way through

Not a transparent pass-through in either direction, deliberately:

- **Request:** the upstream body is rebuilt field by field. `kb_id`,
  `system_prompt`, `top_k` and `temperature` come from this process, so nothing
  typed into the browser console can retarget the query at another knowledge base
  or unpick the grounding instructions. `message` is capped at 2000 characters and
  history at the last 10 valid turns, because both are billed per token.
- **Response:** `chunk_text` and `file_id` are stripped from every source, on the
  streaming path as well as the plain one — raw document text does not belong in a
  public page. Upstream error bodies are never forwarded; they name internal
  services.
- **Scope:** the upstream's `/v1/kb` and `/v1/sessions` are *tenant*-scoped. Served
  verbatim to an unauthenticated widget they would publish every KB under the
  account and every other visitor's sessions, so both are narrowed here — see
  `internal/services/sessions.go`.

### Abuse cap

All browser traffic reaches the upstream from this one server's IP and the upstream
bills per message, so `backend/internal/services/chat.go` caps each client IP and returns
`429 {"error":"Too many messages. Please try again in a few minutes."}` past it.

Two windows, because the two abuse shapes differ. A real conversation is a burst
over a few minutes; a script drains steadily for hours. One window cannot bound
both:

| allowance | limit | bounds |
| --- | --- | --- |
| messages, burst | 30 / 10 min | one visitor hammering the box |
| messages, daily | 150 / 24 h | sustained draining across rolled-over bursts |
| session mints | 20 / 10 min | page-reload churn |

The first version used 10 per 10 minutes, which a five-turn conversation half spent
— and because the widget never reads error bodies, the visitor just sees
"Something went wrong. Please try again." Keep that in mind before tightening
these: a cap that catches real use is indistinguishable from a broken chatbot.
The template's global rate limiter is generic request shaping and has no notion of
what a request costs; it is not a substitute.

Session minting has its own, looser allowance (20 per 10 minutes) rather than sharing
the message quota. It is deliberately generous: the widget mints a session on every
fresh page load, and when a mint is refused it reports "Could not start a session" and
leaves its input **disabled** — so too tight a cap presents to a visitor as a chat box
they cannot type in.

Client identity is the IP, which means visitors behind one NAT share a quota and
a view of each other's sessions. That is the documented ceiling — see the
`ponytail:` comments — and the upgrade path is a signed cookie plus a shared store
if the service is ever replicated.
