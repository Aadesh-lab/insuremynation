/**
 * Self-check for the chat's page context.
 *
 *   node scripts/check-page-context.mjs
 *
 * `landing()` is the piece worth a check: it is stamped once per tab, and read live instead
 * it would return an empty `landed_from` on exactly the journeys worth measuring — a visitor
 * who arrives on an ad and opens the chat two pages later. Nothing would surface that until
 * the campaign reporting came back with no attribution at all.
 *
 * A shim rather than a browser: this is four strings and a storage read.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '../src/components/chat/pageContext.js'), 'utf8');

/** A tab: sessionStorage that survives "navigation", and a location we can move. */
function newTab({ pathname = '/', search = '', referrer = '', title = '' } = {}) {
  const data = new Map();
  globalThis.window = {
    location: { pathname, search },
    sessionStorage: {
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    },
  };
  globalThis.document = { referrer, title };
  return {
    goto(nextPath, nextSearch = '') {
      window.location.pathname = nextPath;
      window.location.search = nextSearch;
    },
    raw: data,
  };
}

// A fresh module per shim: `landing()` caches nothing itself, but the import cache would
// otherwise hand back a copy bound to the previous tab's globals. The marker has to go
// inside the source, not after the base64 — appending to the data URL corrupts it.
let loads = 0;
const load = () =>
  import(
    'data:text/javascript;base64,' +
      Buffer.from(`${src}\n// load ${loads++}\n`).toString('base64')
  );

// --- the journey that matters: arrive on an ad, browse away, then open the chat ----------
let tab = newTab({
  pathname: '/health-insurance',
  search: '?utm_source=google&utm_campaign=health-delhi',
  referrer: 'https://www.google.com/',
  title: 'Health Insurance — InsureNation',
});
let { pageContext, landing } = await load();

// First read on the landing page stamps it.
let ctx = pageContext();
assert.equal(ctx.page, '/health-insurance');
assert.equal(ctx.landed_from, 'utm_source=google&utm_campaign=health-delhi');
assert.equal(ctx.referrer, 'https://www.google.com/');
assert.equal(ctx.product, '');
assert.equal(ctx.page_title, 'Health Insurance — InsureNation');

// Browse to a page with no query string and no referrer, then open the chat.
tab.goto('/about');
globalThis.document.referrer = '';
ctx = pageContext();
assert.equal(ctx.page, '/about', 'page is current');
assert.equal(
  ctx.landed_from,
  'utm_source=google&utm_campaign=health-delhi',
  'landed_from is FIRST-seen, not current — this is the whole attribution story'
);
assert.equal(ctx.referrer, 'https://www.google.com/', 'referrer is first-seen too');

// --- the home-page ad landing ------------------------------------------------------------
tab = newTab({ pathname: '/', search: '?product=life&utm_source=google' });
({ pageContext } = await load());
ctx = pageContext();
assert.equal(ctx.page, '/');
assert.equal(ctx.product, 'life', 'the ?product= parameter is passed through verbatim');
assert.equal(ctx.landed_from, 'product=life&utm_source=google');

// --- direct arrival, nothing to attribute ------------------------------------------------
tab = newTab({ pathname: '/contact' });
({ pageContext } = await load());
ctx = pageContext();
assert.equal(ctx.landed_from, '');
assert.equal(ctx.referrer, '');
assert.equal(ctx.product, '');

// --- storage disabled (private mode) must not throw --------------------------------------
newTab({ pathname: '/health-insurance', search: '?utm_source=x' });
window.sessionStorage.getItem = () => {
  throw new Error('denied');
};
window.sessionStorage.setItem = () => {
  throw new Error('denied');
};
({ pageContext } = await load());
ctx = pageContext();
assert.equal(ctx.landed_from, 'utm_source=x', 'falls back to the live value rather than failing');

// --- a corrupt value in our key must not throw either -------------------------------------
tab = newTab({ pathname: '/', search: '?utm_source=y' });
tab.raw.set('insurenation-chat-landing', '{not json');
({ pageContext } = await load());
ctx = pageContext();
assert.equal(ctx.landed_from, 'utm_source=y', 'unparseable stored value is re-stamped');

console.log('pageContext: all checks passed');
