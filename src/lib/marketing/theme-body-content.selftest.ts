/**
 * Node check for Theme body + record content merging (run: npx --yes tsx src/lib/marketing/theme-body-content.selftest.ts).
 */
import type { PageLayoutBand, PageLayoutBlock } from './appearance-types';
import { mergeThemeBodyWithContent } from './theme-body-content';

function assert(cond: unknown, label: string): void {
  if (!cond) throw new Error(`FAIL: ${label}`);
}

function band(id: string, blocks: PageLayoutBlock[], layout_width: 'boxed' | 'full' = 'boxed'): PageLayoutBand {
  return {
    id,
    type: 'layout',
    layout_width,
    rows: [{ id: `${id}_r`, columns: [{ id: `${id}_c`, span: { mobile: 12, tablet: 12, desktop: 12 }, blocks }] }],
  };
}

const header = band('tpl_header', [{ id: 'crumbs', type: 'breadcrumb' }, { id: 'title', type: 'post_title' }]);
const slot = band('tpl_slot', [{ id: 'pc', type: 'post_content' }]);
const content = [band('page_a', [{ id: 'h', type: 'heading' }], 'full'), band('page_b', [{ id: 't', type: 'text' }])];

const spliced = mergeThemeBodyWithContent([header, slot], content);
assert(spliced.map((n) => n.id).join(',') === 'tpl_header,page_a,page_b', 'placeholder-only band is replaced by content bands');
assert((spliced[1] as PageLayoutBand).layout_width === 'full', 'content band keeps its width');

const mixed = band('tpl_mixed', [{ id: 'title', type: 'post_title' }, { id: 'pc', type: 'post_content' }]);
const nested = mergeThemeBodyWithContent([mixed], content);
const blocks = (nested[0] as PageLayoutBand).rows[0].columns[0].blocks;
assert(nested.length === 1, 'mixed band stays one band');
assert(blocks.map((b) => b.type).join(',') === 'post_title,inner_band,inner_band', 'content becomes inner bands in place');
assert(blocks[1].id === 'page_a' && (blocks[1].rows?.length ?? 0) === 1, 'inner band keeps rows');

const appended = mergeThemeBodyWithContent([header], content);
assert(appended.map((n) => n.id).join(',') === 'tpl_header,page_a,page_b', 'no placeholder appends content');

assert(mergeThemeBodyWithContent(null, content) === content, 'no theme body returns content');

const disabledSlot = band('tpl_off', [{ id: 'pc', type: 'post_content', enabled: false }]);
const off = mergeThemeBodyWithContent([header, disabledSlot], content);
assert(off.map((n) => n.id).join(',') === 'tpl_header,tpl_off,page_a,page_b', 'disabled placeholder is ignored');

console.log('theme-body-content selftest: ok');
