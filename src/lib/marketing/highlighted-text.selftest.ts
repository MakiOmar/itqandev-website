/**
 * Tiny node check for headline highlight markers (run: npx --yes tsx src/lib/marketing/highlighted-text.selftest.ts).
 */
import { parseHighlightedText, stripHighlightMarkers } from './highlighted-text';

function assertEqual(actual: unknown, expected: unknown, label: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${label}: expected ${e}, got ${a}`);
}

assertEqual(parseHighlightedText('Plain headline'), [{ text: 'Plain headline', highlight: false }], 'no markers');

assertEqual(
  parseHighlightedText('We build web, Android [[& iOS]] apps'),
  [
    { text: 'We build web, Android ', highlight: false },
    { text: '& iOS', highlight: true },
    { text: ' apps', highlight: false },
  ],
  'one marker',
);

assertEqual(
  parseHighlightedText('[[Fast]] and [[safe]]'),
  [
    { text: 'Fast', highlight: true },
    { text: ' and ', highlight: false },
    { text: 'safe', highlight: true },
  ],
  'leading and multiple markers',
);

assertEqual(parseHighlightedText('Open [[ only'), [{ text: 'Open [[ only', highlight: false }], 'unmatched open');
assertEqual(parseHighlightedText('Empty [[]] pair'), [{ text: 'Empty [[]] pair', highlight: false }], 'empty pair literal');
assertEqual(parseHighlightedText(''), [], 'empty string');

assertEqual(stripHighlightMarkers('We build [[& iOS]] apps'), 'We build & iOS apps', 'strip');
assertEqual(stripHighlightMarkers('Open [[ only'), 'Open [[ only', 'strip unmatched');

console.log('highlighted-text selftest OK');
