/**
 * Writes the 4:3 flag SVGs used by language switchers into public/flags/.
 * Source: @iconify-json/flag (flag-icons, MIT). Country codes are read from
 * src/lib/i18n/language-flags.ts so the map stays the single source of truth.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const set = require('@iconify-json/flag/icons.json');

const mapSource = readFileSync(join(root, 'src/lib/i18n/language-flags.ts'), 'utf8');
const mapBlock = mapSource.match(/FLAG_COUNTRY_BY_LANG[^{]*\{([^}]*)\}/);
if (!mapBlock) {
  throw new Error('FLAG_COUNTRY_BY_LANG not found in language-flags.ts');
}
const countries = [...new Set([...mapBlock[1].matchAll(/:\s*'([a-z]{2})'/g)].map((m) => m[1]))];

const outDir = join(root, 'public/flags');
mkdirSync(outDir, { recursive: true });

for (const country of countries) {
  const icon = set.icons[`${country}-4x3`];
  if (!icon) {
    throw new Error(`No flag for "${country}" in @iconify-json/flag`);
  }
  const width = icon.width ?? set.width;
  const height = icon.height ?? set.height;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${icon.body}</svg>\n`;
  writeFileSync(join(outDir, `${country}.svg`), svg);
}

console.log(`Wrote ${countries.length} flags to public/flags/: ${countries.join(', ')}`);
