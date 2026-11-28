import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getLanguageFlagSrc } from '../src/lib/i18n/language-flags.ts';

test('english and arabic switchers use the UK and Egypt flags', () => {
  assert.equal(getLanguageFlagSrc('en'), '/flags/gb.svg');
  assert.equal(getLanguageFlagSrc('ar'), '/flags/eg.svg');
  assert.equal(getLanguageFlagSrc('AR'), '/flags/eg.svg');
  assert.match(readFileSync(new URL('../public/flags/eg.svg', import.meta.url), 'utf8'), /<svg/);
  assert.match(readFileSync(new URL('../public/flags/gb.svg', import.meta.url), 'utf8'), /<svg/);
});
