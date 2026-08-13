# InsureNation — React implementation

React port of the InsureNation design handoff (`insurenation-website/project/*.dc.html`).
The visual design is reproduced exactly: no colour, image, copy or spacing value
was changed.

## Running

```bash
npm install
npm run dev
```

| script | what it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | production build into `dist/` |
| `npm run preview` | serve the production build |
| `npm run images` | regenerate `public/assets/` from the handoff bundle |

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
public/assets/        lossless WebP artwork + the SVG icons
scripts/
  convert-images.mjs  handoff PNG/JPG -> lossless WebP (q100)
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

The prototype sizes everything with inline styles against a 1728px canvas, then
reshapes it through `[data-r="..."]` media queries. That structure is kept:

- Element styles stay inline, matching the source values one-for-one.
- Every `@media` block is reproduced verbatim in `src/styles/global.css`.
- Because all pages share one CSS bundle and several `data-r` names mean
  different things per page (`badge`, `srow`, `stitle`, `cimg`, `cgrid`),
  page-specific blocks are scoped by a root class — `.p-landing`, `.p-about`,
  `.p-sub` — plus two narrower hooks: `.p-sub[data-product="health"]` for the
  Health cover artwork and `.p-sub[data-page="contact"]` for the details grid.

## Images

`npm run images` converts every raster asset with
`sharp().webp({ lossless: true, quality: 100, effort: 6 })` and copies the SVG
icons unchanged. Lossless means pixel-identical output — the large PNG heroes
shrink substantially, while assets that arrived as JPEG grow, since lossless
re-encoding cannot recover the space a lossy codec already saved.

### The blue hero treatment

Every hero photo in the design carries a blue gradient map, and the handoff
bundle ships those with the treatment already baked in. The Contact hero is the
exception: its design-exported file was not included, only the untreated stock
photo, so the treatment has to be re-applied.

`scripts/blue-duotone-lut.json` is that treatment, recovered from the heroes
that *did* ship treated (marine, life, career). Those three agree on a single
mapping from Rec.709 luminance to a blue ramp, with a within-bin spread of only
2–8/255 — i.e. a pure gradient map, not a partial blend. It preserves luminance
exactly, so a photo's tonality survives untouched and only its hue changes.

Re-applying the LUT to a reference reproduces it to a mean absolute error of
1.1/255; on a held-out treated hero it lands within 12/255. Entries marked
`duotone: true` in `scripts/convert-images.mjs` get the LUT applied before
encoding.

## Animation

Interactions carried over from the prototype: the hero photo collage crossfade
and headline rotation, the services and building-block hover rows, the
testimonial rail, the nav dropdown, and the form submit-state transitions.

The insurance pages add scroll-triggered motion via Framer Motion
(`src/components/Reveal.jsx`), reusing the design's own easing curve
`cubic-bezier(0.22, 1, 0.36, 1)`. Every animated element settles at exactly the
position, scale and colour the design specifies, so the page at rest is
unchanged. `prefers-reduced-motion` collapses all of it.
