// tools/make-thumbs.mjs - Generate thumbnails using sharp
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SRC_DIRS = [path.join(rootDir, 'images')];
const OUT_DIR = path.join(rootDir, 'thumbnails');
const SIZES = [
  { width: 800, suffix: '800' },    // Gallery thumbnail
  { width: null, suffix: '2000' }   // Full-size (no resize, max quality)
];
const IMAGE_EXTS = ['.tif', '.tiff', '.png', '.jpg', '.jpeg'];

// Ensure output directory exists
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function isImage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

function walkDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results.push(...walkDir(filePath));
    } else if (stat.isFile() && isImage(filePath)) {
      results.push(filePath);
    }
  }

  return results;
}

async function processImage(srcPath) {
  try {
    const baseName = path.basename(srcPath, path.extname(srcPath));

    // Extract object ID from path (e.g., images/m42/final/M42.png -> m42)
    // This gives us Latin-only filenames for Telegram compatibility
    const pathParts = srcPath.split(path.sep);
    const objectId = pathParts[pathParts.indexOf('images') + 1] || baseName;

    // Read and validate the image first
    const image = sharp(srcPath);
    const metadata = await image.metadata();
    console.log(`Processing ${baseName} (${objectId}): ${metadata.format} ${metadata.width}x${metadata.height}, channels: ${metadata.channels}, depth: ${metadata.depth}`);

    for (const size of SIZES) {
      // Use object ID for thumbnail name (Latin only - no Cyrillic)
      const outPath = path.join(OUT_DIR, `${objectId}_${size.suffix}.jpg`);

      // Start with sharp instance
      let processor = sharp(srcPath)
        .ensureAlpha()
        .flatten({ background: { r: 0, g: 0, b: 0 } });

      // Apply resize only if width is specified (for 800px version)
      // For full-size version (width: null), skip resize to preserve original dimensions
      if (size.width !== null) {
        processor = processor.resize(size.width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        });
        console.log(`Resizing to ${size.width}px width...`);
      } else {
        console.log(`Keeping original size (full quality)...`);
      }

      // Convert to JPEG with high quality
      await processor
        .jpeg({ quality: 95, mozjpeg: true })
        .toFile(outPath);

      const stats = fs.statSync(outPath);
      console.log(`Saved ${outPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  } catch (err) {
    console.error(`Error processing ${srcPath}:`, err.message);
    console.error(`Full error:`, err);
  }
}

async function main() {
  console.log('Searching for images...');
  const images = [];

  for (const srcDir of SRC_DIRS) {
    if (!fs.existsSync(srcDir)) {
      console.log(`Directory ${srcDir} does not exist, skipping...`);
      continue;
    }

    images.push(...walkDir(srcDir));
  }

  console.log(`Found ${images.length} images`);

  for (const imagePath of images) {
    await processImage(imagePath);
  }

  console.log(`\nDone! Processed ${images.length} images`);
}

main().catch(console.error);
