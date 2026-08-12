/**
 * Converts every raster asset from the design handoff into lossless WebP (q100)
 * and copies the SVG icons across untouched.
 *
 * Source: _source/insurenation-website/project/{assets,*.png}
 * Target: public/assets/
 *
 * Pass substrings to rebuild only the assets whose output name matches, e.g.
 *   npm run images -- contact
 * Re-encoding the full set takes minutes, so this is the usual way to pick up a
 * single changed asset.
 */
import { readdir, mkdir, copyFile, stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = path.join(root, '_source', 'insurenation-website', 'project');
const srcAssets = path.join(projectDir, 'assets');
const outDir = path.join(root, 'public', 'assets');

// Full-bleed hero photos that live at the project root rather than in assets/.
// Renamed to the short slugs the React pages reference.
//
// `duotone: true` marks images supplied as untreated stock. Every hero in the
// design carries a blue gradient map; the handoff bundle ships those already
// baked in, but where only the raw source survived we re-apply the treatment
// here so the page matches the rest of the site.
const rootImages = {
  'young-happy-couple-making-agreement-with-msjbwo1w-we1a.png': { slug: 'landing-hero' },
  'young-happy-parents-enjoying-coloring-wi-msjcakqy-j5k5.png': { slug: 'claim-hero' },
  'team-business-people-stacking-hands-1-msjbz9o3-tjbj.png': { slug: 'about-hero' },
  'contact-us-customer-support-hotline-people-connect-call-customer-support.jpg': {
    slug: 'contact-hero',
    duotone: true,
  },
};

const RASTER = /\.(png|jpe?g)$/i;

/**
 * The site's blue gradient map, recovered from the treated heroes that shipped
 * in the bundle (marine, life, career). It maps Rec.709 luminance to a blue
 * ramp and preserves luminance exactly, so tonality is untouched.
 */
const LUT = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'blue-duotone-lut.json'), 'utf8')
);

async function applyDuotone(input) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.allocUnsafe(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const L = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2] + 0.5) | 0;
    out[i] = LUT.r[L];
    out[i + 1] = LUT.g[L];
    out[i + 2] = LUT.b[L];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

async function toWebp(from, toBase, { duotone = false } = {}) {
  const to = path.join(outDir, `${toBase}.webp`);
  const img = duotone ? await applyDuotone(from) : sharp(from);
  await img.webp({ lossless: true, quality: 100, effort: 6 }).toFile(to);
  const [a, b] = await Promise.all([stat(from), stat(to)]);
  return { name: `${toBase}.webp`, before: a.size, after: b.size, duotone };
}

async function run() {
  if (!existsSync(srcAssets)) {
    console.error(`Source assets not found at ${srcAssets}`);
    process.exit(1);
  }
  await mkdir(outDir, { recursive: true });

  const filters = process.argv.slice(2).map((s) => s.toLowerCase());
  const wanted = (slug) => !filters.length || filters.some((f) => slug.toLowerCase().includes(f));

  const planned = [];

  for (const file of await readdir(srcAssets)) {
    const from = path.join(srcAssets, file);
    if (RASTER.test(file)) {
      const slug = file.replace(RASTER, '');
      if (wanted(slug)) planned.push([from, slug, {}]);
    } else if (file.toLowerCase().endsWith('.svg') && !filters.length) {
      await copyFile(from, path.join(outDir, file));
    }
  }

  for (const [file, { slug, duotone }] of Object.entries(rootImages)) {
    if (wanted(slug)) planned.push([path.join(projectDir, file), slug, { duotone }]);
  }

  if (!planned.length) {
    console.error(`No assets matched: ${filters.join(', ')}`);
    process.exit(1);
  }

  // Encode a few at a time — lossless WebP on the multi-megapixel heroes is
  // memory hungry, and running all of them at once thrashes.
  const results = [];
  const CONCURRENCY = 4;
  for (let i = 0; i < planned.length; i += CONCURRENCY) {
    const batch = planned.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((args) => toWebp(...args)))));
  }
  results.sort((x, y) => x.name.localeCompare(y.name));

  const mb = (n) => (n / 1024 / 1024).toFixed(2);
  let before = 0;
  let after = 0;
  for (const r of results) {
    before += r.before;
    after += r.after;
    console.log(
      `${r.name.padEnd(34)} ${mb(r.before).padStart(8)} MB -> ${mb(r.after).padStart(8)} MB` +
        (r.duotone ? '  [blue duotone applied]' : '')
    );
  }
  console.log(`\n${results.length} images: ${mb(before)} MB -> ${mb(after)} MB`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
