# InsureNation chat — headless integration guide

For building your own chat UI against the InsureNation assistant. Three HTTP endpoints,
JSON in and JSON out, no SDK and no framework requirement.

If you would rather not build the UI, the drop-in widget is one script tag and you can stop
reading:

```html
<!-- imagine.bo Chat Widget -->
<script>
  (function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s); js.id = id;
    js.src = 'https://orchestrator.imagine.bo/embed/imagine-chat.js?token=wgt_slc4VUonB2plFt7lX_JoPzfExlKRe69TGKEbV-ipqzQ&environment=production&proxyEndpoint=https://orchestrator.imagine.bo';
    js.async = true;
    fjs.parentNode.insertBefore(js, fjs);
  }(document, 'script', 'imagine-chat-widget'));
</script>
```

Everything below is what that script does, so you can do it yourself.

## Credentials

| | |
| --- | --- |
| Base URL | `https://orchestrator.imagine.bo` |
| Widget token | `wgt_slc4VUonB2plFt7lX_JoPzfExlKRe69TGKEbV-ipqzQ` |

The token is not a secret — it ships in a public script tag and identifies the widget, not
the caller. What actually protects the endpoint is the **domain allowlist**: every request
carries the browser's `Origin`, and the server rejects any origin not on the widget's list.

**Before you write a line of code, make sure your origins are allowlisted** — production,
staging and whatever you use locally. Ask us to add them; a missing origin returns `403`
with the origin echoed back, which is the fastest way to diagnose it.

There are no API keys, no bearer tokens and no cookies anywhere in this integration.

## The three endpoints

All are public, unauthenticated, CORS-enabled and `Content-Type: application/json`.

### 1. `GET /widget-proxy/config?token=<widget_token>`

Optional. Branding/config without starting a conversation — use it if you want to theme
your launcher from the dashboard rather than hardcoding.

```
200 { "config": { "settings": { ... }, "footer_enabled": true } }
```

### 2. `POST /widget-proxy/init`

Starts a conversation. Creates the run, executes the opening turn, returns the greeting.
**Call this when the visitor opens the panel, not on page load** — see *Don't auto-open*.

```json
{
  "widget_token": "wgt_slc4VUonB2plFt7lX_JoPzfExlKRe69TGKEbV-ipqzQ",
  "context_variables": {
    "page": "/health-insurance",
    "product": "",
    "landed_from": "utm_source=google&utm_campaign=health-delhi",
    "referrer": "https://www.google.com/",
    "page_title": "Health Insurance — InsureNation"
  }
}
```

```json
200 {
  "session_token": "wcs_xxxxxxxxxxxxxxxxxxxx",
  "run_id": 48213,
  "config": { "settings": { }, "footer_enabled": true },
  "opening_message": "Hi! I'm the InsureNation assistant.\n\nHappy to help you with health cover…"
}
```

Hold `session_token` for the rest of the conversation. Log `run_id` — it is the key we and
your CRM use to find this exact conversation when something looks wrong.

`opening_message` can be `null` in an edge case; render nothing rather than an empty bubble.

### 3. `POST /widget-proxy/message`

One visitor message, one assistant reply.

```json
{ "session_token": "wcs_xxxxxxxxxxxxxxxxxxxx", "text": "Family floater - me, spouse and kids" }
```

```json
200 {
  "assistant_text": "Got it. And the age of the eldest person to be covered?\n\n- 18 to 35\n- 36 to 50\n…",
  "finished": false,
  "session_expired": false
}
```

`text` must be non-empty. No server-side maximum is enforced; cap it around 2000
characters client-side so a paste accident doesn't become an expensive turn.

## Context variables — do not skip this

The drop-in widget collects these automatically. **A custom UI has to send them itself**,
and the assistant behaves noticeably worse without them.

| Key | What to send | Why it matters |
| --- | --- | --- |
| `page` | `location.pathname` | The assistant opens at the right question. On `/health-insurance` it goes straight to "Who would the cover be for?" instead of asking which cover — which is the whole point of running ads per product line. |
| `product` | the `?product=` query parameter, or `""` | Handles the home-page ad landing (`/?product=health`). Wins over `page` when both are set. |
| `landed_from` | the query string the visitor **arrived** with | This is what ties a closed policy back to the ad that paid for it. It reaches the CRM as campaign attribution. |
| `referrer` | `document.referrer` at first load | Attribution for organic and referral traffic. |
| `page_title` | `document.title` | Context on the lead record. |

`landed_from` and `referrer` must be **first-seen, not current**. The visitor lands on
`/health-insurance?utm_source=google`, browses to `/about`, and only then opens the chat —
by which point the UTMs are gone from the URL. So stamp them once on first load and reuse
them:

```js
const LANDING_KEY = 'insurenation-chat-landing';

function landing() {
  try {
    const stored = sessionStorage.getItem(LANDING_KEY);
    if (stored) return JSON.parse(stored);
    const fresh = {
      landed_from: location.search.replace(/^\?/, ''),
      referrer: document.referrer || '',
    };
    sessionStorage.setItem(LANDING_KEY, JSON.stringify(fresh));
    return fresh;
  } catch {
    return { landed_from: '', referrer: '' }; // private mode — best effort
  }
}

function pageContext() {
  return {
    page: location.pathname || '/',
    product: new URLSearchParams(location.search).get('product') || '',
    page_title: document.title || '',
    ...landing(),
  };
}
```

Use **`sessionStorage`, not `localStorage`** — here and for the transcript. People ask this
assistant about health conditions and money, and `localStorage` hands the last visitor's
conversation to the next person on a shared machine.

Anything else you put in `context_variables` is stored on the run and visible in reporting,
so it is a fine place for your own `customer_id` or A/B bucket. Do not put anything secret
in it: it comes from the browser.

## Minimal working client

Complete and dependency-free. Wire your UI to the three callbacks.

```js
const BASE = 'https://orchestrator.imagine.bo';
const TOKEN = 'wgt_slc4VUonB2plFt7lX_JoPzfExlKRe69TGKEbV-ipqzQ';

class InsureNationChat {
  constructor({ onMessage, onError, onFinished }) {
    this.sessionToken = null;
    this.finished = false;
    this.busy = false;
    this.onMessage = onMessage;   // (role, text) => void
    this.onError = onError;       // (userFacingMessage) => void
    this.onFinished = onFinished; // () => void
  }

  async post(path, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      const res = await fetch(`${BASE}/widget-proxy/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const data = await res.json().catch(() => null);
      return { status: res.status, data };
    } finally {
      clearTimeout(timer);
    }
  }

  async start() {
    if (this.sessionToken) return;
    const { status, data } = await this.post('init', {
      widget_token: TOKEN,
      context_variables: pageContext(),
    });
    if (status !== 200 || !data?.session_token) {
      this.onError(errorText(status));
      return;
    }
    this.sessionToken = data.session_token;
    this.runId = data.run_id;
    this.finished = false;
    if (data.opening_message) this.onMessage('assistant', data.opening_message);
  }

  async send(text) {
    text = (text || '').trim();
    if (!text || this.busy) return;
    if (this.finished) await this.restart();
    if (!this.sessionToken) await this.start();
    if (!this.sessionToken) return;

    this.busy = true;
    this.onMessage('user', text);
    try {
      let { status, data } = await this.post('message', {
        session_token: this.sessionToken,
        text,
      });

      // Idled out server-side: start a fresh conversation and resend once.
      if (status === 200 && data?.session_expired) {
        this.sessionToken = null;
        await this.start();
        if (!this.sessionToken) return;
        ({ status, data } = await this.post('message', {
          session_token: this.sessionToken,
          text,
        }));
      }

      if (status !== 200) {
        this.onError(errorText(status));
        return;
      }
      if (data.assistant_text) this.onMessage('assistant', data.assistant_text);
      if (data.finished) {
        this.finished = true;
        this.sessionToken = null;
        this.onFinished();
      }
    } catch (e) {
      this.onError(
        e.name === 'AbortError'
          ? 'That took too long. Please try again.'
          : 'The assistant is unavailable right now. Please call +91 99101 69789.',
      );
    } finally {
      this.busy = false;
    }
  }

  async restart() {
    this.sessionToken = null;
    this.finished = false;
    await this.start();
  }
}
```

Send exactly one message at a time. The `busy` guard matters: each turn runs a model call
server-side, and two in flight will interleave and confuse the funnel.

## Shape of the conversation

Worth knowing so your UI does not fight it. A typical website chat runs:

1. **Greeting.** On a product page it opens with the first qualification question; on the
   home page or an info page it asks which cover they want.
2. **Contact.** Name, mobile and email in one message, with a consent line. Early, so a
   lead exists in the CRM from here on — a refusal is fine and the chat continues.
3. **Five questions**, one per turn, each with its own option lines.
4. **Summary**, then "would you like an adviser to call you back?"
5. **Close** — callback confirmed, handover to phone/email, or a graceful goodbye.
   `finished: true` arrives here.

Claims enquiries and job enquiries branch off after step 2 and skip the questions.

## Conversation lifecycle

```
open panel ──► init ──► render opening_message
                          │
                          ▼
        ┌──────► POST message ──► render assistant_text
        │              │
        │              ├─ session_expired: true ─► init again, resend once
        └──────────────┤
                       └─ finished: true ─► conversation is over
```

**`finished: true`** means the conversation reached a terminal state — the callback is
confirmed, or the visitor was handed the phone number, or they dropped out. The session is
deleted server-side. Render the final message, then either disable the composer or offer a
"Start a new chat" button that calls `init` again. Do not send to a finished session; you
will get `session_expired` and silently start a second conversation, which means a
duplicate lead.

**`session_expired: true`** means the token is unknown or the session went idle. The idle
window is **30 minutes**, sliding — it resets on every message. Re-init and resend once, as
the reference client does; the visitor sees a small pause rather than an error.

Each session is one run and one lead. A visitor who finishes, then messages again an hour
later, is a second run — that is intended, not a bug.

## Rendering the replies

**Plain text, never markdown.** The assistant is instructed never to emit `**bold**` or
markdown lists, because the drop-in widget renders with `textContent`. If you render with
`innerHTML` you must escape — and you must not "helpfully" run it through a markdown
renderer, because nothing in the output is markdown.

- Preserve newlines: `white-space: pre-wrap`, or split on `\n`.
- Escape before inserting: `el.textContent = text` is the safe default.

**There is no streaming.** One request, one complete reply. Show a typing indicator while
the request is in flight; a turn typically takes a couple of seconds.

### Turning option lines into chips

The assistant presents choices as lines beginning with `- ` at the end of a message, e.g.:

```
Got it. And the age of the eldest person to be covered?

- 18 to 35
- 36 to 50
- 51 to 60
- Over 60
```

Rendering those as tappable chips is worth doing — it is how the funnel is designed to be
answered, and typing is what loses people on mobile. Send the chip's **label** as the
message text; the backend normalises it to its stored value, so "36 to 50" and "my dad is
47" both land correctly.

```js
function splitOptions(text) {
  const lines = text.split('\n');
  const options = [];
  while (lines.length) {
    const line = lines[lines.length - 1].trim();
    if (!line) { lines.pop(); continue; }          // trailing blank
    const m = line.match(/^-\s+(.{1,80})$/);
    if (!m) break;                                  // hit prose: stop
    options.unshift(m[1]);
    lines.pop();
  }
  return options.length >= 2
    ? { body: lines.join('\n').trim(), options }
    : { body: text, options: [] };
}
```

This is a heuristic on generated text, so treat it as a progressive enhancement: require at
least two options before rendering chips, keep the free-text composer available at all
times, and if the parse finds nothing just show the message as-is. Never *only* show chips —
a visitor must always be able to type "we are four in Gurgaon" instead.

## Errors

Show the difference. The hosted widget we replaced flattened everything to "Something went
wrong", and a visitor cannot tell a domain misconfiguration from a dropped connection.

| Status | Meaning | Show the visitor | Retry? |
| --- | --- | --- | --- |
| `400` | malformed body, or missing `session_token`/`text` | nothing — fix the client | no |
| `403` | origin not on the domain allowlist | "chat unavailable" + the phone number | no — call us |
| `404` | widget token unknown or deactivated | "chat unavailable" + the phone number | no — call us |
| `422` | text was empty after trimming | nothing — guard client-side | no |
| `5xx` | upstream or model failure | "The assistant is unavailable right now." | yes |
| network / timeout | connection dropped | "Please check your connection and try again." | yes |
| `200` with empty `assistant_text` | the turn produced nothing | "I don't have an answer for that. Please try rephrasing." | yes |

```js
function errorText(status) {
  if (status === 403 || status === 404)
    return 'Chat is unavailable on this page. Please call +91 99101 69789.';
  if (status >= 500)
    return 'The assistant is unavailable right now. Please try again in a moment.';
  return 'Something went wrong. Please try again.';
}
```

On a failed turn, **take the visitor's message back out of the transcript and put the text
back in the composer** so they retry without retyping. Every non-retryable error should
show the phone number `+91 99101 69789` and `nehal@insuremynation.com`.

## Things that will bite you

- **CORS allows `Content-Type` only.** Adding any other request header — `Authorization`,
  `X-Request-Id`, a tracing header your framework injects — fails the preflight and the
  request never arrives. No cookies or credentials either; don't set `credentials:
  'include'`.
- **Don't auto-open the panel.** On paid traffic an uninvited panel over the hero reads as a
  popup and costs the page the ad paid for. Launcher visible, conversation started on tap.
  `init` runs a model turn, so opening on page load also bills every bounce.
- **Nothing is rate-limited on this path.** Each `message` call runs a model turn, and the
  endpoint is public. Debounce the send button, block concurrent sends, and consider a
  per-visitor cap in your own layer.
- **Don't reuse a `session_token` across tabs**, and don't persist it anywhere but
  `sessionStorage`. It is a bearer token for one conversation.
- **The assistant will not quote a premium**, a waiting period, an eligibility decision or
  an IDV figure — by design, because none of it exists in its knowledge base and an invented
  figure is quotable back at the firm. Don't build UI that implies a quote is coming.
- **It asks for name, mobile and email early** — in the second or third turn, right after
  the visitor's cover is known, not at the end. Don't add your own contact form anywhere in
  the flow; you will ask twice, and the lead is captured either way.
- **A visitor who refuses that ask keeps going.** The assistant carries straight on into the
  questions and asks once more only at the close. So do not treat "no contact details yet"
  as a dead conversation, and do not block the composer or nag on your side.
- Email is deliberately not chased — a visitor who gives a name and a number gets their
  callback confirmed, so don't build UI that treats a missing email as an incomplete lead.

## Test checklist

1. Open on `/health-insurance` → the opener does **not** ask which cover; it asks who the
   cover is for.
2. Open on `/?product=life&utm_source=google` → life funnel, and tell us the `run_id` so we
   can confirm `landed_from` arrived as `product=life&utm_source=google`.
3. Open on `/about` → "Which cover are you looking for?" with six option lines.
4. Land on `/health-insurance?utm_source=test`, browse to `/about`, then open the chat →
   `landed_from` is still `utm_source=test`.
5. Answer five questions, accept the callback → `finished: true` arrives and the composer
   closes. You are not asked for your details a second time; the early ask covered it.
5a. Run it again and **refuse** the contact ask → the questions continue anyway, and you
   are asked once more only at the close. A stalled funnel here is a bug worth reporting.
6. Send to that finished session → `session_expired`, and your client starts a fresh
   conversation rather than erroring.
7. Idle 31 minutes, then send → same graceful restart.
8. Kill your network mid-turn → distinguishable error, message returned to the composer.
9. Load from a non-allowlisted origin → `403`, and your UI shows the phone number.
10. Confirm no asterisks, `**`, or raw `\n` characters appear anywhere in the rendered
    transcript.
11. Double-click send fast → only one turn is sent.

## Support

Give us the `run_id` from `init`. Every conversation is reportable end to end by that id —
what the visitor typed, what was captured, and whether the lead reached the CRM.
