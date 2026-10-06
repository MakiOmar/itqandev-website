/**
 * Context-menu actions on builder nodes (band, row, column, block), addressed by tree path so the
 * canvas and the navigator share them. Every function returns new bands; inputs are not mutated.
 */
import { newBandId, newBlockId, newColumnId, newRowId } from './builder-ids';
import {
  isInnerBandBlock,
  layoutTreeChildKind,
  layoutTreeKindAt,
  layoutTreeListAt,
  layoutTreeNodeAt,
  type LayoutTreeNode,
  type LayoutTreeNodeKind,
  type LayoutTreePath,
} from './page-layout-tree';
import type {
  PageLayoutBand,
  PageLayoutBlock,
} from '../marketing/appearance-types';

export type BuilderNodeAction =
  | 'edit'
  | 'duplicate'
  | 'copy'
  | 'paste'
  | 'copy_style'
  | 'paste_style'
  | 'reset_style'
  | 'save_template'
  | 'save_global'
  | 'unlink_global'
  | 'navigator'
  | 'delete';

export type BuilderNodeClipboard = { kind: LayoutTreeNodeKind; node: LayoutTreeNode };

/** Style tab bag plus the container Background (settings.background); blocks also record their type. */
export type BuilderStyleClipboard = {
  kind: LayoutTreeNodeKind;
  type?: string;
  styles: unknown;
  background?: unknown;
};

const NODE_CLIPBOARD_KEY = 'credocode:builder-node-clipboard';
const STYLE_CLIPBOARD_KEY = 'credocode:builder-style-clipboard';

type Result = { bands: PageLayoutBand[]; path: LayoutTreePath } | null;

function cloneBands(bands: PageLayoutBand[]): PageLayoutBand[] {
  return JSON.parse(JSON.stringify(bands)) as PageLayoutBand[];
}

/** Deep copy with new ids on the node and everything inside it (ids scope CSS and globals). */
export function withFreshIds(node: LayoutTreeNode, kind: LayoutTreeNodeKind): LayoutTreeNode {
  const copy = JSON.parse(JSON.stringify(node)) as Record<string, unknown>;
  const walk = (n: Record<string, unknown>, k: LayoutTreeNodeKind) => {
    if (k === 'band') n.id = newBandId();
    else if (k === 'row') n.id = newRowId();
    else if (k === 'column') n.id = newColumnId();
    else n.id = newBlockId(String(n.type || 'block'));
    const key = k === 'band' || k === 'block' ? 'rows' : k === 'row' ? 'columns' : 'blocks';
    const childKind = layoutTreeChildKind(k);
    const children = n[key];
    if (childKind && Array.isArray(children)) {
      children.forEach((c) => walk(c as Record<string, unknown>, childKind));
    }
  };
  walk(copy, kind);
  return copy as unknown as LayoutTreeNode;
}

export function duplicateLayoutNode(bands: PageLayoutBand[], path: LayoutTreePath): Result {
  const node = layoutTreeNodeAt(bands, path);
  if (!node) return null;
  const next = cloneBands(bands);
  const list = layoutTreeListAt(next, path.slice(0, -1));
  if (!list) return null;
  const at = path[path.length - 1] + 1;
  list.splice(at, 0, withFreshIds(node, layoutTreeKindAt(path.length)));
  return { bands: next, path: [...path.slice(0, -1), at] };
}

/** Removes the node; a row left without columns goes too, matching the canvas column remove. */
export function removeLayoutNode(bands: PageLayoutBand[], path: LayoutTreePath): PageLayoutBand[] {
  const next = cloneBands(bands);
  const list = layoutTreeListAt(next, path.slice(0, -1));
  if (!list || !list[path[path.length - 1]]) return bands;
  list.splice(path[path.length - 1], 1);
  if (layoutTreeKindAt(path.length) === 'column' && list.length === 0) {
    return removeLayoutNode(next, path.slice(0, -1));
  }
  return next;
}

/**
 * Same kind as the target: insert after it. One level down (block into a column, column into a
 * row, row into a band or inner band): append inside. Anything else is not pasteable there.
 */
export function pasteLayoutNode(
  bands: PageLayoutBand[],
  target: LayoutTreePath,
  clip: BuilderNodeClipboard,
): Result {
  const targetNode = layoutTreeNodeAt(bands, target);
  if (!targetNode) return null;
  const targetKind = layoutTreeKindAt(target.length);
  const next = cloneBands(bands);
  const fresh = withFreshIds(clip.node, clip.kind);

  if (clip.kind === targetKind) {
    const list = layoutTreeListAt(next, target.slice(0, -1));
    if (!list) return null;
    const at = target[target.length - 1] + 1;
    list.splice(at, 0, fresh);
    return { bands: next, path: [...target.slice(0, -1), at] };
  }

  const insideOk =
    layoutTreeChildKind(targetKind) === clip.kind &&
    (targetKind !== 'block' || isInnerBandBlock(targetNode as PageLayoutBlock));
  if (!insideOk) return null;
  const list = layoutTreeListAt(next, target, true);
  if (!list) return null;
  list.push(fresh);
  return { bands: next, path: [...target, list.length - 1] };
}

export function canPasteLayoutNode(
  bands: PageLayoutBand[],
  target: LayoutTreePath,
  clip: BuilderNodeClipboard | null,
): boolean {
  return !!clip && pasteLayoutNode(bands, target, clip) !== null;
}

export function copyLayoutNodeStyle(bands: PageLayoutBand[], path: LayoutTreePath): BuilderStyleClipboard | null {
  const node = layoutTreeNodeAt(bands, path) as Record<string, unknown> | null;
  if (!node) return null;
  const kind = layoutTreeKindAt(path.length);
  const settings = (node.settings ?? {}) as Record<string, unknown>;
  return {
    kind,
    type: kind === 'block' ? String(node.type ?? '') : undefined,
    styles: node.styles ?? null,
    background: kind === 'block' ? undefined : settings.background,
  };
}

/** Block styles are widget-specific, so they paste only onto the same widget type. */
export function canPasteLayoutNodeStyle(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
  clip: BuilderStyleClipboard | null,
): boolean {
  if (!clip) return false;
  const node = layoutTreeNodeAt(bands, path) as Record<string, unknown> | null;
  if (!node) return false;
  const kind = layoutTreeKindAt(path.length);
  if (clip.kind === 'block' || kind === 'block') {
    return clip.kind === kind && clip.type === String(node.type ?? '');
  }
  return true;
}

function updateNodeAt(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
  update: (node: Record<string, unknown>) => void,
): PageLayoutBand[] {
  const next = cloneBands(bands);
  const node = layoutTreeNodeAt(next, path) as Record<string, unknown> | null;
  if (!node) return bands;
  update(node);
  return next;
}

export function pasteLayoutNodeStyle(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
  clip: BuilderStyleClipboard,
): PageLayoutBand[] {
  return updateNodeAt(bands, path, (node) => {
    node.styles = clip.styles ? JSON.parse(JSON.stringify(clip.styles)) : undefined;
    if (layoutTreeKindAt(path.length) === 'block') return;
    const settings = { ...((node.settings ?? {}) as Record<string, unknown>) };
    if (clip.background) settings.background = JSON.parse(JSON.stringify(clip.background));
    else delete settings.background;
    node.settings = settings;
  });
}

export function resetLayoutNodeStyle(bands: PageLayoutBand[], path: LayoutTreePath): PageLayoutBand[] {
  return pasteLayoutNodeStyle(bands, path, { kind: layoutTreeKindAt(path.length), styles: null });
}

function readJson<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[builder] clipboard write failed', err);
  }
}

/** Kept in localStorage so a copied node can be pasted into another page or builder tab. */
export function readNodeClipboard(): BuilderNodeClipboard | null {
  const clip = readJson<BuilderNodeClipboard>(NODE_CLIPBOARD_KEY);
  return clip && clip.node && typeof clip.kind === 'string' ? clip : null;
}

export function writeNodeClipboard(clip: BuilderNodeClipboard): void {
  writeJson(NODE_CLIPBOARD_KEY, clip);
}

export function readStyleClipboard(): BuilderStyleClipboard | null {
  const clip = readJson<BuilderStyleClipboard>(STYLE_CLIPBOARD_KEY);
  return clip && typeof clip.kind === 'string' ? clip : null;
}

export function writeStyleClipboard(clip: BuilderStyleClipboard): void {
  writeJson(STYLE_CLIPBOARD_KEY, clip);
}
