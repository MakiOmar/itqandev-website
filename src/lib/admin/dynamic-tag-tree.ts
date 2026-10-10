import type { DynamicTag, DynamicTagCatalog } from '~/lib/admin/appearance-actions';

export type DynamicTagTreeNode = {
  id: string;
  /** API label; the dropdown translates by the last id segment and falls back to this. */
  label: string;
  tags: DynamicTag[];
  children: DynamicTagTreeNode[];
  /** Tags in this node and all descendants. */
  total: number;
};

function matches(tag: DynamicTag, groupLabel: string, query: string): boolean {
  return `${tag.label} ${tag.id} ${groupLabel}`.toLowerCase().includes(query);
}

function prune(node: DynamicTagTreeNode): DynamicTagTreeNode | null {
  const children = node.children.map(prune).filter((c): c is DynamicTagTreeNode => c !== null);
  const total = node.tags.length + children.reduce((sum, c) => sum + c.total, 0);
  return total > 0 ? { ...node, children, total } : null;
}

/**
 * Nests catalog groups under their `parent` (content type → relation) and drops groups left
 * without tags. A non-empty query keeps only matching tags; tags in unknown groups get their own node.
 */
export function buildDynamicTagTree(catalog: DynamicTagCatalog, query = ''): DynamicTagTreeNode[] {
  const needle = query.trim().toLowerCase();
  const nodes = new Map<string, DynamicTagTreeNode>();
  for (const group of catalog.groups) {
    nodes.set(group.id, { id: group.id, label: group.label, tags: [], children: [], total: 0 });
  }
  for (const tag of catalog.tags) {
    const groupId = tag.group || 'site';
    let node = nodes.get(groupId);
    if (!node) {
      node = { id: groupId, label: groupId, tags: [], children: [], total: 0 };
      nodes.set(groupId, node);
    }
    if (!needle || matches(tag, node.label, needle)) node.tags.push(tag);
  }

  const parents = new Map(catalog.groups.map((g) => [g.id, g.parent]));
  const roots: DynamicTagTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = parents.get(node.id);
    const parentNode = parent ? nodes.get(parent) : undefined;
    if (parentNode) parentNode.children.push(node);
    else roots.push(node);
  }

  return roots.map(prune).filter((n): n is DynamicTagTreeNode => n !== null);
}
