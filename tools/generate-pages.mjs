// tools/generate-pages.mjs
import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const sessionsDir = path.resolve('data/sessions');
const objectsDir = path.resolve('data/objects');
const outDir = path.resolve('site/src/content/galaxy');
fs.mkdirSync(outDir, { recursive: true });

const objects = Object.fromEntries(
  fs.readdirSync(objectsDir)
    .filter(f => f.endsWith('.yml'))
    .map(f => {
      const y = YAML.parse(fs.readFileSync(path.join(objectsDir, f), 'utf8'));
      return [y.id, y];
    })
);

for (const f of fs.readdirSync(sessionsDir)) {
  if (!f.endsWith('.yml')) continue;
  const ses = YAML.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8'));
  const obj = objects[ses.object_id] || {};
  const title = `${obj.name || ses.object_id} — ${ses.date_utc}`;
  const finals = (ses.finals || []);
  const first = finals[0] || {};
  const mdx = `---
title: ${JSON.stringify(title)}
preview: ${JSON.stringify(first.preview || '')}
final: ${JSON.stringify(first.path || '')}
meta:
  object: ${JSON.stringify(obj)}
  session: ${JSON.stringify(ses)}
---

# ${title}

![preview](${first.preview || ''})

[Завантажити фінал](${first.path || ''})
`;
  const out = path.join(outDir, f.replace(/\.yml$/, '.mdx'));
  fs.writeFileSync(out, mdx, 'utf8');
  console.log('Generated', out);
}
