/**
 * Updates jurisdiction translations in locale files (de, fr, es, pt, ko, it, nl, ar)
 */

const fs = require('fs');
const path = require('path');
const translations = require('./jurisdiction-translations.js');

const SEARCH_PLACEHOLDER = {
  de: 'Land suchen',
  fr: 'Rechercher un pays',
  es: 'Buscar país',
  pt: 'Pesquisar país',
  ko: '국가 검색',
  it: 'Cerca paese',
  nl: 'Land zoeken',
  ar: 'البحث عن دولة',
};

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const LOCALES = ['de', 'fr', 'es', 'pt', 'ko', 'it', 'nl', 'ar'];

for (const loc of LOCALES) {
  const filePath = path.join(LOCALES_DIR, `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const jurisdictions = {};
  for (const [code, names] of Object.entries(translations)) {
    jurisdictions[`country${code}`] = names[loc];
  }
  jurisdictions.searchPlaceholder = SEARCH_PLACEHOLDER[loc];

  data.jurisdictions = jurisdictions;
  fs.writeFileSync(filePath, JSON.stringify(data));
  console.log(`Updated ${loc}.json`);
}

console.log('Done.');
