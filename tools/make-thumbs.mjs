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

    for (const width of SIZES) {
      const outPath = path.join(OUT_DIR, `${baseName}_${width}.jpg`);

      await sharp(srcPath)
        .resize(width, null, { withoutEnlargement: true })
        .jpeg({ quality: 90, mozjpeg: true })
        .toFile(outPath);

      console.log(`Saved ${outPath}`);
    }
  } catch (err) {
    console.error(`Error processing ${srcPath}:`, err.message);
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
