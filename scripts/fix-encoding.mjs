/**
 * Fix UTF-8 mojibake in HTML files only.
 * Does NOT remove U+FFFD — use restore-punctuation.mjs for that.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const replacements = [
  [/\u00E2\u20AC\u00BA/g, '\u203A'], // ›
  [/\u00E2\u20AC[\u201C\u201D\u0094\u2013\u2014"]/g, '\u2014'], // —
  [/\u00E2\u20AC\u2122/g, '\u2019'],
  [/\u00E2\u20AC\u0153/g, '\u201C'],
  [/\u00E2\u20AC\u009D/g, '\u201D'],
  [/\u00E2\u20AC\u00A6/g, '\u2026'],
  [/\u00E2\u20AC\u2013/g, '\u2013'],
];

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let n = 0;
for (const file of htmlFiles) {
  const filePath = path.join(root, file);
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', file);
    n++;
  }
}
console.log(`Done. ${n} file(s) updated.`);
