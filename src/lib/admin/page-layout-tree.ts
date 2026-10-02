import type {
  PageLayoutBand,
  PageLayoutBlock,
  PageLayoutColumn,
  PageLayoutRow,
} from '~/lib/marketing/appearance-types';

/**
 * Index path into the layout tree. Depth 1 = band, then row → column → block,
 * repeating row → column → block inside an inner band block.
 */
export type LayoutTreePath = number[];

export type LayoutTreeNodeKind = 'band' | 'row' | 'column' | 'block';

export type LayoutTreeDropPosition = 'before' | 'after' | 'inside';

export type LayoutTreeFlatNode = {
  key: string;
  path: LayoutTreePath;
  kind: LayoutTreeNodeKind;
  label: string;
  depth: number;
  /** True when other nodes can be dropped inside (band, row, column, inner band). */
  container: boolean;
};

export type LayoutTreeNode = PageLayoutBand | PageLayoutRow | PageLayoutColumn | PageLayoutBlock;
type TreeNode = LayoutTreeNode;

const CYCLE: LayoutTreeNodeKind[] = ['row', 'column', 'block'];

/** Top-level columns sit at depth 3; deeper columns are already inside an inner band. */
const TOP_COLUMN_DEPTH = 3;

export function layoutTreeKindAt(depth: number): LayoutTreeNodeKind {
  return depth <= 1 ? 'band' : CYCLE[(depth - 2) % 3];
}

export function isInnerBandBlock(block: PageLayoutBlock | undefined): boolean {
  return !!block && (block.type === 'inner_band' || block.kind === 'inner');
}

export function layoutTreePathKey(path: LayoutTreePath): string {
  return path.join('.');
}

export function layoutTreeChildKind(kind: LayoutTreeNodeKind): LayoutTreeNodeKind | null {
  return childKind(kind);
}

function childKind(kind: LayoutTreeNodeKind): LayoutTreeNodeKind | null {
  if (kind === 'band' || kind === 'block') return 'row';
  if (kind === 'row') return 'column';
  return 'block';
}

function childrenOf(
  node: TreeNode,
  kind: LayoutTreeNodeKind,
  create = false,
): TreeNode[] | null {
  if (kind === 'band') return (node as PageLayoutBand).rows ?? null;
  if (kind === 'row') return (node as PageLayoutRow).columns ?? null;
  if (kind === 'column') return (node as PageLayoutColumn).blocks ?? null;
  const block = node as PageLayoutBlock;
  if (!isInnerBandBlock(block)) return null;
  if (!block.rows) {
    if (!create) return [];
    block.rows = [];
  }
  return block.rows;
}

/** Child list of the node at `parentPath` (the bands themselves for `[]`); mutates when `create`. */
export function layoutTreeListAt(
  bands: PageLayoutBand[],
  parentPath: LayoutTreePath,
  create = false,
): TreeNode[] | null {
  return listAt(bands, parentPath, create);
}

function listAt(
  bands: PageLayoutBand[],
  parentPath: LayoutTreePath,
  create = false,
): TreeNode[] | null {
  let list: TreeNode[] | null = bands;
  for (let i = 0; i < parentPath.length; i += 1) {
    const node: TreeNode | undefined = list?.[parentPath[i]];
    if (!node) return null;
    list = childrenOf(node, layoutTreeKindAt(i + 1), create);
    if (!list) return null;
  }
  return list;
}

export function layoutTreeNodeAt(
  bands: PageLayoutBand[],
  path: LayoutTreePath,
): TreeNode | null {
  if (path.length === 0) return null;
  const list = listAt(bands, path.slice(0, -1));
  return list?.[path[path.length - 1]] ?? null;
}

function isPrefix(prefix: LayoutTreePath, path: LayoutTreePath): boolean {
  if (prefix.length > path.length) return false;
  return prefix.every((v, i) => path[i] === v);
}

/** Whether `from` may be dropped at `to` with the given position. */
export function canDropLayoutTreeNode(
  bands: PageLayoutBand[],
  from: LayoutTreePath,
  to: LayoutTreePath,
  position: LayoutTreeDropPosition,
): boolean {
  return resolveDropTarget(bands, from, to, position) !== null;
}

function resolveDropTarget(
  bands: PageLayoutBand[],
  from: LayoutTreePath,
  to: LayoutTreePath,
  position: LayoutTreeDropPosition,
): { parentPath: LayoutTreePath; index: number } | null {
  if (from.length === 0 || to.length === 0) return null;
  const source = layoutTreeNodeAt(bands, from);
  const target = layoutTreeNodeAt(bands, to);
  if (!source || !target) return null;

  const fromKind = layoutTreeKindAt(from.length);
  const toKind = layoutTreeKindAt(to.length);

  let parentPath: LayoutTreePath;
  let index: number;
  if (position === 'inside') {
    if (childKind(toKind) !== fromKind) return null;
    if (toKind === 'block' && !isInnerBandBlock(target as PageLayoutBlock)) return null;
    parentPath = to;
    index = listAt(bands, to)?.length ?? 0;
  } else {
    if (toKind !== fromKind) return null;
    parentPath = to.slice(0, -1);
    index = to[to.length - 1] + (position === 'after' ? 1 : 0);
  }

  if (isPrefix(from, parentPath)) return null;
  if (
    fromKind === 'block' &&
    isInnerBandBlock(source as PageLayoutBlock) &&
    parentPath.length > TOP_COLUMN_DEPTH
  ) {
    return null;
  }
  if (!listAt(bands, parentPath)) return null;
  return { parentPath, index };
}

/**
 * Move a node (band, row, column, or block) to a new position, returning new bands
 * and the node's new path, or null when the move is invalid or a no-op.
 */
export function moveLayoutTreeNode(
  bands: PageLayoutBand[],
  from: LayoutTreePath,
  to: LayoutTreePath,
  position: LayoutTreeDropPosition,
): { bands: PageLayoutBand[]; path: LayoutTreePath } | null {
  const target = resolveDropTarget(bands, from, to, position);
  if (!target) return null;

  const next = JSON.parse(JSON.stringify(bands)) as PageLayoutBand[];
  const fromParent = from.slice(0, -1);
  const fromIndex = from[from.length - 1];
  const sourceList = listAt(next, fromParent);
  if (!sourceList) return null;
  const [node] = sourceList.splice(fromIndex, 1);
  if (!node) return null;

  const parentPath = [...target.parentPath];
  let index = target.index;
  const level = fromParent.length;
  if (parentPath.length > level && isPrefix(fromParent, parentPath) && parentPath[level] > fromIndex) {
    parentPath[level] -= 1;
  }
  const sameParent = layoutTreePathKey(parentPath) === layoutTreePathKey(fromParent);
  if (sameParent && index > fromIndex) index -= 1;
  if (sameParent && index === fromIndex) return null;

  const targetList = listAt(next, parentPath, true);
  if (!targetList) return null;
  const at = Math.min(Math.max(0, index), targetList.length);
  targetList.splice(at, 0, node);
  return { bands: next, path: [...parentPath, at] };
}

/** Depth-first flat list of the tree for rendering an outline. */
export function flattenLayoutTree(
  bands: PageLayoutBand[],
  labels: Record<LayoutTreeNodeKind, string>,
): LayoutTreeFlatNode[] {
  const out: LayoutTreeFlatNode[] = [];
  const walk = (list: TreeNode[], parent: LayoutTreePath) => {
    list.forEach((node, i) => {
      const path = [...parent, i];
      const kind = layoutTreeKindAt(path.length);
      const inner = kind === 'block' && isInnerBandBlock(node as PageLayoutBlock);
      const label =
        kind === 'block' ? String((node as PageLayoutBlock).type) : `${labels[kind]} ${i + 1}`;
      out.push({
        key: node.id || layoutTreePathKey(path),
        path,
        kind,
        label,
        depth: path.length - 1,
        container: kind !== 'block' || inner,
      });
      const children = kind === 'block' && !inner ? null : childrenOf(node, kind);
      if (children) walk(children, path);
    });
  };
  walk(bands, []);
  return out;
}
