#!/usr/bin/env node
/**
 * Check that all locale JSON files have the same keys as en.json (reference).
 * Usage: node scripts/check-locales.js
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const LOCALE_FILES = ['en.json', 'ru.json', 'fr.json', 'de.json', 'es.json', 'it.json', 'nl.json', 'pt.json', 'ko.json', 'ar.json'];

function flatten(obj, prefix = '') {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && typeof val !== 'string') {
      keys.push(...flatten(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadLocale(filename) {
  const filepath = path.join(LOCALES_DIR, filename);
  const raw = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(raw);
}

const ref = loadLocale('en.json');
const refKeys = new Set(flatten(ref));
const refKeysSorted = [...refKeys].sort();

console.log('Reference: en.json');
console.log('Total keys in en.json:', refKeys.size);
console.log('');

const results = { missing: {}, extra: {} };
const locales = LOCALE_FILES.filter((f) => f !== 'en.json');

for (const file of locales) {
  const name = file.replace('.json', '');
  const data = loadLocale(file);
  const keys = new Set(flatten(data));
  const missing = refKeysSorted.filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !refKeys.has(k)).sort();
  if (missing.length) results.missing[name] = missing;
  if (extra.length) results.extra[name] = extra;
}

let hasMissing = false;
console.log('=== Missing keys (compared to en.json) ===');
for (const [locale, keys] of Object.entries(results.missing)) {
  hasMissing = true;
  console.log(`\n${locale}.json (${keys.length} missing):`);
  keys.forEach((k) => console.log(`  - ${k}`));
}

if (!hasMissing) {
  console.log('None. All locales have the same keys as en.json.');
}

console.log('\n=== Extra keys (present in locale but not in en.json) ===');
let hasExtra = false;
for (const [locale, keys] of Object.entries(results.extra)) {
  hasExtra = true;
  console.log(`\n${locale}.json (${keys.length} extra):`);
  keys.forEach((k) => console.log(`  + ${k}`));
}
if (!hasExtra) {
  console.log('None.');
}

process.exit(hasMissing ? 1 : 0);
