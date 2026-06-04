import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Fix mojibake (3-byte sequences) -> proper Unicode
const mojibakeFixes = [
  [/\u00E2\u20AC[\u201C\u201D\u0094\u2013\u2014"]/g, '\u2014'],
  [/\u00E2\u20AC\u2122/g, '\u2019'],
  [/\u00E2\u20AC\u0153/g, '\u201C'],
  [/\u00E2\u20AC\u009D/g, '\u201D'],
  [/\u00E2\u20AC\u00A6/g, '\u2026'],
  [/\u00E2\u20AC\u2013/g, '\u2013'],
];

// Replacement character (U+FFFD) and double-space damage from prior fix
function fixReplacementChar(content) {
  // Context-specific U+FFFD fixes
  content = content.replace(/\uFFFD/g, (match, offset, str) => {
    const before = str.slice(Math.max(0, offset - 24), offset);
    const after = str.slice(offset + 1, offset + 12);
    if (/exceed\s*$/.test(before) || /£/.test(before)) return '\u00A3';
    if (/practitioners\s*$/.test(before) || /Loading\s*$/.test(before)) return '\u2026';
    if (/Browse All\s*$/.test(before)) return '\u2192';
    if (/View More\s*$/.test(before)) return '\u2192';
    if (/\?\s*$/.test(before) && /</.test(after)) return '\u2192';
    // Default: em dash (most common on this site)
    return '\u2014';
  });

  // Double spaces where em dash was stripped (no FFFD left)
  const dashPatterns = [
    [/Terms of Service  The/g, 'Terms of Service \u2014 The'],
    [/Est\. MMXXVI  Seeker/g, 'Est. MMXXVI \u2014 Seeker'],
    [/Est\. MMXXVII  Seeker/g, 'Est. MMXXVII \u2014 Seeker'],
    [/directory  no sign-in/g, 'directory \u2014 no sign-in'],
    [/one  before you/g, 'one \u2014 before you'],
    [/like Yelp  but/g, 'like Yelp \u2014 but'],
    [/wanted help  the kind/g, 'wanted help \u2014 the kind'],
    [/Directory  Find/g, 'Directory \u2014 Find'],
    [/Hero  Spell/g, 'Hero \u2014 Spell'],
    [/story  why/g, 'story \u2014 why'],
    [/hard time\. We wanted help  /g, 'hard time. We wanted help \u2014 '],
    [/right one  before/g, 'right one \u2014 before'],
    [/found yet  be the first/g, 'found yet \u2014 be the first'],
    [/exceed 100 \(one hundred pounds/g, 'exceed \u00A3100 (one hundred pounds'],
    [/Loading practitioners(?!…|\u2026)/g, 'Loading practitioners\u2026'],
    [/Loading practitioners\u2026\u2026/g, 'Loading practitioners\u2026'],
  ];
  for (const [re, rep] of dashPatterns) {
    content = content.replace(re, rep);
  }

  return content;
}

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const before = content;
  for (const [re, rep] of mojibakeFixes) {
    content = content.replace(re, rep);
  }
  content = fixReplacementChar(content);
  if (content !== before) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

// Restore support pages from git then fix (they lost FFFD entirely)
const restoreFromGit = [
  'about.html', 'admin.html', 'contact.html', 'disclaimer.html', 'faq.html',
  'index.html', 'privacy-policy.html', 'profile.html', 'saved.html',
  'submit-practitioner.html', 'terms.html',
];

for (const file of restoreFromGit) {
  try {
    const gitContent = execSync(`git show HEAD:${file}`, { cwd: root, encoding: 'utf8' });
    fs.writeFileSync(path.join(root, file), gitContent, 'utf8');
    console.log('Restored from git:', file);
  } catch (e) {
    console.warn('Skip git restore:', file, e.message);
  }
}

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html'));
let n = 0;
for (const file of htmlFiles) {
  if (fixFile(path.join(root, file))) {
    console.log('Fixed punctuation:', file);
    n++;
  }
}
console.log(`\nDone. ${n} file(s) punctuation-fixed.`);
