/**
 * Node check for builder context-menu actions (run: npx --yes tsx src/lib/admin/page-builder-node-actions.selftest.ts).
 */
import {
  canPasteLayoutNodeStyle,
  copyLayoutNodeStyle,
  dropBlocksOverLimit,
  duplicateLayoutNode,
  exceededBlockLimit,
  pasteLayoutNode,
  pasteLayoutNodeStyle,
  removeLayoutNode,
  resetLayoutNodeStyle,
} from './page-builder-node-actions';
import type { AppearanceRegistryEntry, PageLayoutBand } from '../marketing/appearance-types';

function assert(cond: unknown, message: string): void {
  if (!cond) throw new Error(message);
}

const bands = (): PageLayoutBand[] => [
  {
    id: 'band_a',
    type: 'layout',
    settings: { background: { type: 'color', color: '#f00' } },
    styles: { spacing: { padding: '1rem' } } as never,
    rows: [
      {
        id: 'row_a',
        columns: [
          {
            id: 'col_a',
            span: { mobile: 12, tablet: 6, desktop: 6 },
            blocks: [
              { id: 'blk_h', kind: 'widget', type: 'heading', settings: { text: 'Hi' }, styles: { typography: { size: 20 } } as never },
              { id: 'blk_hero', kind: 'kit', type: 'hero', settings: {} },
            ],
          },
          { id: 'col_b', span: { mobile: 12, tablet: 6, desktop: 6 }, blocks: [] },
        ],
      },
    ],
  } as PageLayoutBand,
];

// Duplicate: inserted after the source with new ids all the way down.
const dup = duplicateLayoutNode(bands(), [0]);
assert(dup && dup.bands.length === 2 && dup.path.join('.') === '1', 'band duplicated after source');
assert(dup!.bands[1].id !== 'band_a', 'duplicate band has a new id');
assert(dup!.bands[1].rows[0].columns[0].blocks[0].id !== 'blk_h', 'nested block ids regenerated');
assert(dup!.bands[0].id === 'band_a', 'source untouched');

// Paste: same kind goes after the target; a block onto a column goes inside it.
const heading = bands()[0].rows[0].columns[0].blocks[0];
const afterBlock = pasteLayoutNode(bands(), [0, 0, 0, 0], { kind: 'block', node: heading });
assert(afterBlock?.path.join('.') === '0.0.0.1', 'block pasted after target block');
const intoColumn = pasteLayoutNode(bands(), [0, 0, 1], { kind: 'block', node: heading });
assert(intoColumn?.path.join('.') === '0.0.1.0', 'block pasted into empty column');
assert(pasteLayoutNode(bands(), [0], { kind: 'block', node: heading }) === null, 'block cannot paste onto a band');

// Remove: the last column takes its row with it.
const noCol = removeLayoutNode(removeLayoutNode(bands(), [0, 0, 1]), [0, 0, 0]);
assert(noCol[0].rows.length === 0, 'row removed with its last column');

// Styles: containers carry background; block styles only fit the same widget type.
const bandStyle = copyLayoutNodeStyle(bands(), [0])!;
const rowStyled = pasteLayoutNodeStyle(bands(), [0, 0], bandStyle);
assert(
  JSON.stringify((rowStyled[0].rows[0].settings as Record<string, unknown>).background) === JSON.stringify({ type: 'color', color: '#f00' }),
  'band background pasted onto row',
);
const headingStyle = copyLayoutNodeStyle(bands(), [0, 0, 0, 0])!;
assert(!canPasteLayoutNodeStyle(bands(), [0, 0, 0, 1], headingStyle), 'heading style does not fit hero');
assert(!canPasteLayoutNodeStyle(bands(), [0, 0], headingStyle), 'block style does not fit a row');
const reset = resetLayoutNodeStyle(bands(), [0]);
assert(!reset[0].styles && !(reset[0].settings as Record<string, unknown>).background, 'reset clears styles and background');

// Limits: a second hero exceeds max_instances 1.
const registry = [{ type: 'hero', kind: 'kit', label: 'Hero', max_instances: 1 }] as AppearanceRegistryEntry[];
const twoHeroes = duplicateLayoutNode(bands(), [0, 0, 0, 1])!;
assert(exceededBlockLimit(twoHeroes.bands, registry) === 'Hero', 'second hero flagged');
assert(exceededBlockLimit(bands(), registry) === null, 'one hero is fine');

// A duplicated band drops the limited hero from the copy but keeps the rest.
const trimmed = dropBlocksOverLimit(dup!.bands, dup!.path, registry);
assert(trimmed.skipped.join() === 'Hero', 'hero reported as skipped');
assert(exceededBlockLimit(trimmed.bands, registry) === null, 'trimmed copy within limits');
assert(trimmed.bands[0].rows[0].columns[0].blocks.length === 2, 'source band keeps its hero');
assert(trimmed.bands[1].rows[0].columns[0].blocks.map((b) => b.type).join() === 'heading', 'copy keeps the heading');

console.log('page-builder-node-actions selftest: ok');
