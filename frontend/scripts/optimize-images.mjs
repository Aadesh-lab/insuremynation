/**
 * Re-encodes everything in public/assets for delivery.
 *
 * `convert-images.mjs` writes *lossless* WebP straight off the design handoff,
 * which is right for an archive and completely wrong for the wire: the heroes
 * landed at 4096-6000px and 6-11 MB each, so a single page pulled >10 MB of
 * imagery and the artwork only appeared seconds after the text.
 *
 * This pass caps each asset at the largest size it is ever displayed at and
 * encodes lossy, which takes the set from ~106 MB to a few MB with no visible
 * difference at the sizes the site actually renders. Originals stay in git
 * history if a larger crop is ever needed.
 *
 *   npm run images:optimize          # whole set
 *   npm run images:optimize -- hero  # only assets whose name matches
 */
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'assets');

/**
 * Widest each asset is ever painted at, rounded up to leave headroom for
 * high-DPI screens. Full-bleed artwork is the only thing that needs to cover a
 * 2560px monitor; everything else sits inside a column.
 */
const POLICY = [
  // Partner wall + site logos: painted ~200px wide, flat colour, keep crisp.
  { test: /^(partner-|logo)/, width: 600, quality: 90 },
  // Full-bleed heroes and the cover artwork beside the checklists.
  { test: /(^hero-|-hero-|^cover-|-cover-)/, width: 2400, quality: 80 },
  // Service rows, gallery tiles, everything else in a column.
  { test: /.*/, width: 1400, quality: 80 },
];

const policyFor = (name) => POLICY.find((p) => p.test.test(name));

async function run() {
  const filters = process.argv.slice(2).map((s) => s.toLowerCase());
  const wanted = (name) => !filters.length || filters.some((f) => name.toLowerCase().includes(f));

  const files = (await readdir(dir)).filter((f) => /\.(webp|png|jpe?g)$/i.test(f) && wanted(f));
  if (!files.length) {
    console.error(`No assets matched: ${filters.join(', ')}`);
    process.exit(1);
  }

  let before = 0;
  let after = 0;
  let skipped = 0;

  for (const file of files.sort()) {
    const from = path.join(dir, file);
    const policy = policyFor(file);
    // Read through a buffer: sharp keeps the input file open until the pipeline
    // is torn down, and Windows refuses to overwrite a file it still holds.
    const source = await readFile(from);
    const meta = await sharp(source).metadata();
    const sizeBefore = source.length;
    const width = Math.min(policy.width, meta.width);

    const encoded = await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: policy.quality, effort: 6 })
      .toBuffer();

    const sizeAfter = encoded.length;
    before += sizeBefore;

    // Never make an asset heavier than it already is.
    if (sizeAfter >= sizeBefore) {
      after += sizeBefore;
      skipped += 1;
      continue;
    }

    const target = path.join(dir, file.replace(/\.(png|jpe?g)$/i, '.webp'));
    await writeFile(target, encoded);
    if (target !== from) await unlink(from);
    after += sizeAfter;

    const kb = (n) => (n / 1024).toFixed(0).padStart(6);
    console.log(
      `${file.padEnd(34)} ${String(meta.width).padStart(5)}px ->` +
        ` ${String(width).padStart(5)}px  ` +
        `${kb(sizeBefore)} KB -> ${kb(sizeAfter)} KB`
    );
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log(
    `\n${files.length} assets: ${mb(before)} MB -> ${mb(after)} MB` +
      (skipped ? `  (${skipped} already smaller, left alone)` : '')
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
