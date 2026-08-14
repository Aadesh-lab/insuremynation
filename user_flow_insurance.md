# InsureMyNation assistant — user flow

What the chat assistant does, turn by turn, on the live site: where a conversation starts,
what it asks, what reaches the CRM, and what a visitor sees when something breaks.

**The assistant is imagine.bo's.** Their orchestrator owns the funnel questions, the system
prompt and the lead capture. Ours is the panel — `frontend/src/components/chat/` — plus the
page context that decides where the funnel opens. The API contract is
[HEADLESS_CHAT_INTEGRATION_v2.md](HEADLESS_CHAT_INTEGRATION_v2.md); this document is the
behaviour around it.

We used to run the whole thing: a Go proxy at `/v1/*` holding a RAG key, our own five-question
funnel in `journeys.js`, per-product prompts in `chat.go`, and no lead capture at all. That is
deleted — the headless integration has no key to hide, so the backend had no reason to exist.
`git log` has it. Nothing below describes it.

---

## 1. The parts

| part | file | job |
| --- | --- | --- |
| launcher + panel | `ChatWidget.jsx`, `ChatPanel.jsx`, `Message.jsx` | UI. Mounted once, outside `<Routes>`, so it survives navigation |
| client | `useHeadlessChat.js` | three endpoints, one turn at a time, errors, terminal state, transcript persistence |
| page context | `pageContext.js` | `context_variables`: which page, and first-seen ad attribution |
| chips | `splitOptions.js` | the `- ` lines of a reply become tappable answers |

Two `node` checks, no framework, for the two pieces that fail silently:
`scripts/check-split-options.mjs` and `scripts/check-page-context.mjs`.

## 2. Where it works at all

The orchestrator enforces a **domain allowlist**, and everything unlisted gets
`403 {"detail":"Domain not allowed: …"}`.

| origin | chat |
| --- | --- |
| `https://insuremynation.imaginebo.app` | works — canonical host, send ads here |
| `https://insuremynation-production.up.railway.app` | 403 (`CANONICAL_HOST` redirects page requests away from it) |
| `http://localhost:5173` | 403 — the funnel cannot be exercised locally |

A 403 is not silent: the panel says *"Chat is unavailable on this page. Please call
+91 99101 69789."* But the page around it looks perfectly healthy, so a wrong domain reads as
a working site with a broken assistant rather than as a misconfiguration.

## 3. Entry points

Ads run per product line, so the page a visitor lands on says which cover they came for. That
is the whole basis of the flow, and it is `context_variables` that carries it.

| how they arrive | what the assistant opens with |
| --- | --- |
| ad → `/health-insurance` (and the five siblings) | that product's first qualifying question |
| ad → `/?product=health` | **documented** to do the same; *observed* to give the generic opener — see §7 |
| organic → `/`, `/about`, `/contact`, `/claim-support`, `/career` | "Which cover are you looking for?" with six product chips |

The panel does **not** auto-open. On paid traffic an uninvited panel over the hero reads as a
popup and costs the page the ad paid for — and `init` runs a model turn, so opening on load
would bill every bounce.

## 4. The flow, step by step

**Step 0 — page load.** Nothing. No session, no request. A visitor who never opens the panel
costs nothing. `landed_from` and `referrer` are stamped into `sessionStorage` on the first
*open*, not on load.

**Step 1 — the visitor taps the launcher.** `POST /widget-proxy/init` with
`context_variables`, or the transcript is restored from `sessionStorage` if this tab already
had a conversation. The reply carries `session_token`, `run_id` and `opening_message`.
`run_id` is logged: it is the only handle their support accepts.

**Steps 2…n — one message, one reply.** `POST /widget-proxy/message`. Each turn:

1. The visitor taps a chip or types. The chip's label *is* the message — their side
   normalises "36 to 50" and "my dad is 47" to the same stored value.
2. One request at a time, enforced by a `busy` guard. Two in flight interleave and confuse
   the funnel, and each costs a model call.
3. The reply is plain text, never markdown, and arrives whole — **there is no streaming**. A
   typing indicator covers the couple of seconds.
4. `splitOptions` pulls the trailing `- ` lines out for chips. The composer stays available
   throughout: a visitor must always be able to type "we are four in Gurgaon" instead.

**The shape of it**, per their guide: greeting → **contact details** → five questions →
summary → "would you like an adviser to call you back?" → close. Claims and job enquiries
branch off after the contact step and skip the questions.

**Step n+1 — the close.** `finished: true`. The session is deleted their side, so the panel
**removes the composer** rather than disabling it and offers *Start a new chat*. Sending into
a finished session would silently open a second conversation, and a second conversation is a
duplicate lead in the CRM.

**Interruptions.** `session_expired: true` (unknown token, or 30 minutes idle, sliding) →
re-init silently and resend once, so the visitor sees a pause rather than an error; the new
greeting is suppressed, or it would land *after* the message they just sent. A failed turn is
pulled back out of the transcript and offered as *Try again*, so nothing is retyped. Mid-
conversation refresh restores the transcript from `sessionStorage` without minting a second
session.

## 5. What reaches the CRM

Theirs to write, but worth knowing what the fields mean when segmenting. Their funnel asks,
per product, roughly what ours did:

- **health** — who is covered (self · self + spouse · family floater · senior-citizen parents)
  → age band of the eldest → city → sum insured (5L · 10L · 25L · 1Cr+) → current position
  (employer cover · own policy · nothing · **a pre-existing condition**)
- **life** — plan type (term · term + savings · ULIP) → age → sum assured → loans to clear →
  dependents
- **car / bike** — renewal or new or lapsed or third-party-only → segment or engine class →
  RTO city → claimed last year (the NCB) → add-ons
- **travel** — destination (Schengen · USA/Canada · UK · Gulf/SE Asia) → trip type → duration
  → travellers (**anyone over 60**) → is it for a visa
- **marine** — import/export/domestic → mode → commodity → single transit or open cover →
  value per shipment

Flag these for a faster call, because they change who should ring and how soon: a pre-existing
condition, a traveller over 60, a visa deadline, a lapsed motor policy, a shipment over
Rs 5 crore, a sum assured of Rs 5 crore or more.

`context.landed_from` is what ties a closed policy back to the ad that paid for it, and it is
**first-seen, not current**: a visitor lands on `/health-insurance?utm_source=google`, browses
to `/about`, then opens the chat — read live, the UTMs are already gone, and the attribution
would be empty on exactly the journeys worth measuring.

**Never add a contact form to the panel.** Their assistant collects name, mobile and email as
part of the funnel; a second ask asks twice for what is already captured. A visitor who refuses
keeps going — do not treat "no details yet" as a dead conversation, and do not nag.

## 6. What the visitor sees when something breaks

The panel shows the difference, deliberately: the hosted widget we replaced flattened
everything to "Something went wrong", and a visitor could not tell a misconfigured domain from
a dropped connection.

| condition | shown | retry helps? |
| --- | --- | --- |
| `403` / `404` — origin not allowlisted, or token dead | "Chat is unavailable on this page. Please call +91 99101 69789." | no — call them |
| `5xx` | "The assistant is unavailable right now. Please try again in a moment." | yes |
| network dropped, or the 60s timeout | "Please check your connection and try again." | yes |
| `200` with an empty reply | "I don't have an answer for that. Please try rephrasing." | yes |
| anything else | "Something went wrong. Please try again." | maybe |

Every message that does not already carry the phone number gets the phone and email appended.

**Privacy:** `sessionStorage`, never `localStorage` — for the transcript because people ask
this assistant about health conditions and money, and localStorage hands the last visitor's
conversation to the next person on a shared machine; for `session_token` because their guide
says so, it being a bearer token for one conversation.

## 7. Where their side and their guide disagree

Found by running it. Quote the `run_id` when raising any of them.

- **v2's early contact ask is not deployed.** The guide says name, mobile and email arrive in
  the second or third turn; run 5684 walked a whole health funnel and was never asked. Nothing
  here needs changing when it lands — the ask is another turn of text, and this client never
  models whether contact details exist.
- **`context_variables.product` is not honoured.** `/?product=life` sent with `product: "life"`
  still opened the generic "Which cover are you looking for?" (run 5648), where the guide says
  it "wins over `page`". We send it exactly as documented. A one-line workaround exists — send
  the product page's pathname as `page` — but it would put a URL the visitor never visited into
  their reporting, so it is not being done without their say-so.
- **The guide's own `splitOptions` finds nothing.** It walks up from the final line and stops at
  the first non-option, but the live opener ends with a line of prose *after* the list, so it
  returns zero options and chips never render. Ours takes the last contiguous run.
- **The allowlist was not enforced at first.** `Origin: https://evil.example` created run 5645
  and ran a model turn. Fixed. It is still not an abuse control against non-browser callers —
  `Origin` is a header `curl` can set — and their guide is explicit that nothing on this path
  is rate-limited. A cap in our page would be protection that is not there.
- **`localhost:5173` is not allowlisted**, so this path cannot be exercised locally before a
  deploy. Worth chasing: running it locally is what caught the parser and funnel bugs above.

## 8. Also open

- **`frontend/src/data/site.js` states a different office address** from `Contact.jsx`
  (Arunachal Building / Barakhamba Road vs Ambadeep Building / Kasturba Gandhi Marg), so the
  live site shows both. `kb-corpus.txt` uses the Contact page's, which has two corroborating
  references. `site.js` still needs fixing — and whoever configures their prompt should know.
- **Which knowledge base their orchestrator answers from is unconfirmed.**
  `frontend/kb-corpus.txt` is still generated from the site's own copy by
  `scripts/export-kb.mjs`, but ingesting it is their side now. Ask them to re-ingest after copy
  changes, and to confirm the KB.
