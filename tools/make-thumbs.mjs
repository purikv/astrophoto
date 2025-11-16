// tools/make-thumbs.mjs - Generate thumbnails using sharp
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const SRC_DIRS = [path.join(rootDir, 'images')];
const OUT_DIR = path.join(rootDir, 'thumbnails');
const SIZES = [2000, 800];
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

    for (const width of SIZES) {
      // Use object ID for thumbnail name (Latin only - no Cyrillic)
      const outPath = path.join(OUT_DIR, `${objectId}_${width}.jpg`);

      // Convert to RGB if needed and process
      await sharp(srcPath)
        .ensureAlpha()
        .flatten({ background: { r: 0, g: 0, b: 0 } })
        .resize(width, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: 90 })
        .toFile(outPath);

      console.log(`Saved ${outPath}`);
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
