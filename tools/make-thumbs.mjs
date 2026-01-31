// tools/make-thumbs.mjs - Generate thumbnails using sharp
// Reads YAML session files to generate thumbnails for all finals
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SESSIONS_DIR = path.join(rootDir, 'data/sessions');
const OUT_DIR = path.join(rootDir, 'thumbnails');
const SIZES = [
  { width: 800, suffix: '800' },    // Gallery thumbnail
  { width: null, suffix: '2000' }   // Full-size (no resize, max quality)
];

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

async function processImage(srcPath, outputBaseName) {
  try {
    const fullSrcPath = path.join(rootDir, srcPath);

    if (!fs.existsSync(fullSrcPath)) {
      console.warn(`Warning: Image not found: ${fullSrcPath}`);
      return false;
    }

    // Read and validate the image first
    const image = sharp(fullSrcPath);
    const metadata = await image.metadata();
    console.log(`Processing ${outputBaseName}: ${metadata.format} ${metadata.width}x${metadata.height}`);

    for (const size of SIZES) {
      const outPath = path.join(OUT_DIR, `${outputBaseName}_${size.suffix}.jpg`);

      // Start with sharp instance
      let processor = sharp(fullSrcPath)
        .ensureAlpha()
        .flatten({ background: { r: 0, g: 0, b: 0 } });

      // Apply resize only if width is specified (for 800px version)
      if (size.width !== null) {
        processor = processor.resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
      }

      // Convert to JPEG with high quality
      await processor
        .jpeg({ quality: 95, mozjpeg: true })
        .toFile(outPath);

      const stats = fs.statSync(outPath);
      console.log(`  -> ${path.basename(outPath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    }
    return true;
  } catch (err) {
    console.error(`Error processing ${srcPath}:`, err.message);
    return false;
  }
}

async function main() {
  console.log('Reading session YAML files...\n');

  const sessionFiles = fs.readdirSync(SESSIONS_DIR)
    .filter(f => f.endsWith('.yml'));

  let totalImages = 0;
  let processedImages = 0;

  for (const sessionFile of sessionFiles) {
    const sessionPath = path.join(SESSIONS_DIR, sessionFile);
    const session = YAML.parse(fs.readFileSync(sessionPath, 'utf8'));

    if (!session.finals || session.finals.length === 0) {
      console.log(`Skipping ${sessionFile}: no finals`);
      continue;
    }

    console.log(`\n=== ${session.object_id} (${sessionFile}) ===`);

    for (let i = 0; i < session.finals.length; i++) {
      const final = session.finals[i];
      totalImages++;

      // Extract output base name from preview path
      // e.g., "thumbnails/m31_800.jpg" -> "m31"
      // e.g., "thumbnails/m31_1_800.jpg" -> "m31_1"
      let outputBaseName;
      if (final.preview) {
        const previewFileName = path.basename(final.preview, path.extname(final.preview));
        // Remove size suffix (e.g., "_800" or "_2000")
        outputBaseName = previewFileName.replace(/_\d+$/, '');
      } else {
        // Fallback: use object_id + index
        outputBaseName = i === 0 ? session.object_id : `${session.object_id}_${i}`;
      }

      const success = await processImage(final.path, outputBaseName);
      if (success) processedImages++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Processed ${processedImages}/${totalImages} images`);
}

main().catch(console.error);
