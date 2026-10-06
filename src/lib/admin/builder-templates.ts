/**
 * Saved builder templates: a band, row, column or block stored on the server and copied (with
 * fresh ids) into a layout on insert. Unlike globals, inserted copies are not linked.
 */
import { createEmptyBand } from './page-layout';
import { pasteLayoutNode, withFreshIds } from './page-builder-node-actions';
import {
  layoutTreeKindAt,
  layoutTreeNodeAt,
  type LayoutTreeNode,
  type LayoutTreeNodeKind,
  type LayoutTreePath,
} from './page-layout-tree';
import type {
  PageLayoutBand,
  PageLayoutBlock,
  PageLayoutColumn,
  PageLayoutRow,
} from '../marketing/appearance-types';

export type BuilderTemplateKind = LayoutTreeNodeKind;

export type BuilderTemplateRow = {
  id: number;
  name: string;
  kind: BuilderTemplateKind;
  /** Widget/kit type for block templates, for labels. */
  block_type: string | null;
  updated_at: string | null;
};

export type BuilderTemplateContent = { kind: BuilderTemplateKind; node: LayoutTreeNode };

const KINDS: readonly BuilderTemplateKind[] = ['band', 'row', 'column', 'block'];

export function isBuilderTemplateKind(value: unknown): value is BuilderTemplateKind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value);
}

export function templateContentAt(bands: PageLayoutBand[], path: LayoutTreePath): BuilderTemplateContent | null {
  const node = layoutTreeNodeAt(bands, path);
  return node ? { kind: layoutTreeKindAt(path.length), node: JSON.parse(JSON.stringify(node)) } : null;
}

/** Wraps a node in a new band appended to the layout when the selection can't hold it. */
function appendWrapped(bands: PageLayoutBand[], content: BuilderTemplateContent): { bands: PageLayoutBand[]; path: LayoutTreePath } {
  const fresh = withFreshIds(content.node, content.kind);
  const at = bands.length;
  if (content.kind === 'band') {
    return { bands: [...bands, fresh as PageLayoutBand], path: [at] };
  }
  const band = createEmptyBand();
  if (content.kind === 'row') {
    band.rows = [fresh as PageLayoutRow];
    return { bands: [...bands, band], path: [at, 0] };
  }
  if (content.kind === 'column') {
    band.rows[0].columns = [fresh as PageLayoutColumn];
    return { bands: [...bands, band], path: [at, 0, 0] };
  }
  band.rows[0].columns[0].blocks = [fresh as PageLayoutBlock];
  return { bands: [...bands, band], path: [at, 0, 0, 0] };
}

/**
 * Inserts a copy at the selection with the clipboard paste rules (after a node of the same kind,
 * or inside its natural parent), trying the selection's ancestors in turn; otherwise appends it
 * in a new band. Returns the new bands and the inserted node's path.
 */
export function insertBuilderTemplate(
  bands: PageLayoutBand[],
  selected: LayoutTreePath | null,
  content: BuilderTemplateContent,
): { bands: PageLayoutBand[]; path: LayoutTreePath } {
  for (let depth = selected?.length ?? 0; depth > 0; depth -= 1) {
    const res = pasteLayoutNode(bands, selected!.slice(0, depth), content);
    if (res) return res;
  }
  return appendWrapped(bands, content);
}
