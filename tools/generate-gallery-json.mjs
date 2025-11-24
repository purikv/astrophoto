// tools/generate-gallery-json.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const sessionsDir = path.join(rootDir, 'data/sessions');
const objectsDir = path.join(rootDir, 'data/objects');
const outFile = path.join(rootDir, 'site/src/data/gallery.json');

// Ensure output directory exists
fs.mkdirSync(path.dirname(outFile), { recursive: true });

// Load all objects
const objects = Object.fromEntries(
  fs.readdirSync(objectsDir)
    .filter(f => f.endsWith('.yml'))
    .map(f => {
      const y = YAML.parse(fs.readFileSync(path.join(objectsDir, f), 'utf8'));
      return [y.id, y];
    })
);

// Load all sessions and combine with objects
const gallery = [];
for (const f of fs.readdirSync(sessionsDir)) {
  if (!f.endsWith('.yml')) continue;

  const ses = YAML.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8'));
  const obj = objects[ses.object_id] || {};
  const title = `${obj.name || ses.object_id} — ${ses.date_utc}`;
  const finals = (ses.finals || []);
  const first = finals[0] || {};

  // Generate Latin-named preview path based on object_id to avoid Cyrillic in URLs
  // Telegram doesn't reliably support Cyrillic filenames even with URL encoding
  const preview = first.preview
    ? `thumbnails/${ses.object_id}_800.jpg`  // Use object_id instead of Cyrillic filename
    : '';

  gallery.push({
    id: f.replace(/\.yml$/, ''),
    title,
    preview,
    final: first.path || '',
    object: obj,
    session: ses
  });
}

// Sort gallery by date (newest first)
gallery.sort((a, b) => {
  const dateA = a.session.date_utc || '';
  const dateB = b.session.date_utc || '';
  return dateB.localeCompare(dateA);
});

// Write JSON file
fs.writeFileSync(outFile, JSON.stringify(gallery, null, 2), 'utf8');
console.log(`Generated ${outFile} with ${gallery.length} items`);
