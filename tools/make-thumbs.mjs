// tools/make-thumbs.mjs — generate responsive thumbnails with sharp.
// For each final image produces:
//   <name>_400.{avif,webp,jpg}
//   <name>_800.{avif,webp,jpg}   <-- gallery display width (also preview path in YAML)
//   <name>_1600.{avif,webp,jpg}
//   <name>_2000.jpg              <-- legacy full-quality JPEG kept for backward-compat viewer
// Skips outputs that already exist and are newer than the source (content-addressable cache).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SESSIONS_DIR = path.join(rootDir, 'data/sessions');
const IMAGES_DIR = path.join(rootDir, 'images');
const OUT_DIR = path.join(rootDir, 'thumbnails');

// Responsive widths rendered in AVIF + WebP + JPEG.
const RESPONSIVE_WIDTHS = [400, 800, 1600];
// Legacy: one big JPEG used by the fullscreen viewer.
const FULL_WIDTH = { width: null, suffix: '2000', formats: ['jpg'] };

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

function isInsideImagesDir(absPath) {
  const resolved = path.resolve(absPath);
  return resolved === IMAGES_DIR || resolved.startsWith(IMAGES_DIR + path.sep);
}

function isFresh(outPath, srcMtimeMs) {
  try {
    const { mtimeMs } = fs.statSync(outPath);
    return mtimeMs >= srcMtimeMs;
  } catch {
    return false;
  }
}

async function writeFormat(processor, outPath, format) {
  if (format === 'avif') return processor.avif({ quality: 60, effort: 4 }).toFile(outPath);
  if (format === 'webp') return processor.webp({ quality: 82 }).toFile(outPath);
  return processor.jpeg({ quality: 92, mozjpeg: true }).toFile(outPath);
}

async function processImage(srcPath, outputBaseName) {
  try {
    const fullSrcPath = path.join(rootDir, srcPath);

    if (!isInsideImagesDir(fullSrcPath)) {
      console.warn(`Refusing path outside images/: ${srcPath}`);
      return false;
    }
    if (!fs.existsSync(fullSrcPath)) {
      console.warn(`Image not found: ${fullSrcPath}`);
      return false;
    }

    const srcStat = fs.statSync(fullSrcPath);
    const metadata = await sharp(fullSrcPath).metadata();
    console.log(`Processing ${outputBaseName}: ${metadata.format} ${metadata.width}x${metadata.height}`);

    const jobs = [];
    for (const width of RESPONSIVE_WIDTHS) {
      for (const fmt of ['avif', 'webp', 'jpg']) {
        const outPath = path.join(OUT_DIR, `${outputBaseName}_${width}.${fmt}`);
        if (isFresh(outPath, srcStat.mtimeMs)) continue;
        const proc = sharp(fullSrcPath)
          .flatten({ background: { r: 0, g: 0, b: 0 } })
          .resize(width, null, { withoutEnlargement: true, fit: 'inside' });
        jobs.push(writeFormat(proc, outPath, fmt).then(() => {
          const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
          console.log(`  -> ${path.basename(outPath)} (${kb} KB)`);
        }));
      }
    }

    // Full-size JPEG (no resize) for max-quality fullscreen viewer.
    for (const fmt of FULL_WIDTH.formats) {
      const outPath = path.join(OUT_DIR, `${outputBaseName}_${FULL_WIDTH.suffix}.${fmt}`);
      if (isFresh(outPath, srcStat.mtimeMs)) continue;
      const proc = sharp(fullSrcPath).flatten({ background: { r: 0, g: 0, b: 0 } });
      jobs.push(writeFormat(proc, outPath, fmt).then(() => {
        const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
        console.log(`  -> ${path.basename(outPath)} (${mb} MB)`);
      }));
    }

    await Promise.all(jobs);
    return true;
  } catch (err) {
    console.error(`Error processing ${srcPath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Reading session YAML files...\n');

  const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.yml'));

  let totalImages = 0;
  let processedImages = 0;

  for (const sessionFile of sessionFiles) {
    const session = YAML.parse(fs.readFileSync(path.join(SESSIONS_DIR, sessionFile), 'utf8'));
    if (!session.finals || session.finals.length === 0) {
      console.log(`Skipping ${sessionFile}: no finals`);
      continue;
    }

    console.log(`\n=== ${session.object_id} (${sessionFile}) ===`);

    for (let i = 0; i < session.finals.length; i++) {
      const final = session.finals[i];
      totalImages++;

      let outputBaseName;
      if (final.preview) {
        const previewFileName = path.basename(final.preview, path.extname(final.preview));
        outputBaseName = previewFileName.replace(/_\d+$/, '');
      } else {
        outputBaseName = i === 0 ? session.object_id : `${session.object_id}_${i}`;
      }

      const ok = await processImage(final.path, outputBaseName);
      if (ok) processedImages++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Processed ${processedImages}/${totalImages} images`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
