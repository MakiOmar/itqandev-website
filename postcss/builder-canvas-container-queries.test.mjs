import { test } from 'node:test';
import assert from 'node:assert/strict';
import postcss from 'postcss';
import plugin, {
  excludeCanvasSelector,
  isWidthOnlyQuery,
} from './builder-canvas-container-queries.js';

const run = (css, from = '/app/src/styles/admin.css') =>
  postcss([plugin()]).process(css, { from }).css;

test('width-only queries are detected; other media features are not', () => {
  assert.ok(isWidthOnlyQuery('(width >= 48rem)'));
  assert.ok(isWidthOnlyQuery('(min-width: 768px) and (max-width: 1023px)'));
  assert.ok(!isWidthOnlyQuery('(hover: hover)'));
  assert.ok(!isWidthOnlyQuery('(prefers-reduced-motion: reduce)'));
  assert.ok(!isWidthOnlyQuery('print and (width >= 48rem)'));
});

test('media rules exclude the canvas and a scoped container copy follows', () => {
  const out = run('@media (width >= 48rem) { .md\\:flex { display: flex } }');
  assert.match(out, /@media \(width >= 48rem\) \{ \.md\\:flex:where\(:not\(\[data-builder-canvas\] \*\)\)/);
  assert.match(out, /@container builder-canvas \(width >= 48rem\) \{ :where\(\[data-builder-canvas\]\) \.md\\:flex \{ display: flex \}/);
  assert.ok(out.indexOf('@media') < out.indexOf('@container'));
});

test('exclusion is inserted before pseudo-elements, not after', () => {
  assert.equal(
    excludeCanvasSelector('.md\\:before\\:block::before'),
    '.md\\:before\\:block:where(:not([data-builder-canvas] *))::before',
  );
  assert.equal(
    excludeCanvasSelector('.x\\:\\[content\\:\\"\\:\\:\\"\\]:hover'),
    '.x\\:\\[content\\:\\"\\:\\:\\"\\]:hover:where(:not([data-builder-canvas] *))',
  );
});

test('site.css only excludes the canvas; no container copy', () => {
  const out = run('@media (width >= 48rem) { .a { color: red } }', 'C:\\app\\src\\styles\\site.css');
  assert.match(out, /\.a:where\(:not\(\[data-builder-canvas\] \*\)\)/);
  assert.doesNotMatch(out, /@container/);
});

test('non-width media and other stylesheets are left untouched', () => {
  const hover = '@media (hover: hover) { .a:hover { color: red } }';
  assert.equal(run(hover), hover);
  const media = '@media (width >= 48rem) { .a { color: red } }';
  assert.equal(run(media, '/app/src/components/marketing/case-study-card.css'), media);
});
