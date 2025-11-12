// tools/make-thumbs-node.mjs - Node.js version of thumbnail generator
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

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

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (stat.isFile()) {
      callback(filePath);
    }
  });
}

function convertImage(srcPath) {
  try {
    const baseName = path.basename(srcPath, path.extname(srcPath));

    for (const width of SIZES) {
      const outPath = path.join(OUT_DIR, `${baseName}_${width}.jpg`);

      // Try using ImageMagick convert command (if available)
      try {
        execSync(`magick "${srcPath}" -resize ${width}x -quality 90 "${outPath}"`, {
          stdio: 'ignore',
          windowsHide: true
        });
        console.log(`Created: ${outPath}`);
        continue;
      } catch (e) {
        // ImageMagick not available, try other methods
      }

      // Try using Windows Photo Viewer or other tools
      // For now, just copy the file as placeholder if no tool available
      console.log(`Warning: Could not resize ${srcPath}, ImageMagick not found`);
      console.log(`Please install ImageMagick or Python with Pillow to generate thumbnails`);
    }
  } catch (err) {
    console.error(`Error processing ${srcPath}:`, err.message);
  }
}

// Process all images
console.log('Searching for images...');
let imageCount = 0;

for (const srcDir of SRC_DIRS) {
  if (!fs.existsSync(srcDir)) {
    console.log(`Directory ${srcDir} does not exist, skipping...`);
    continue;
  }

  walkDir(srcDir, (filePath) => {
    if (isImage(filePath)) {
      imageCount++;
      convertImage(filePath);
    }
  });
}

console.log(`\nProcessed ${imageCount} images`);
console.log(`\nNote: For best results, install either:`);
console.log(`  1. Python with Pillow: pip install pillow`);
console.log(`  2. ImageMagick: https://imagemagick.org/script/download.php`);
