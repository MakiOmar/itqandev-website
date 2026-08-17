/**
 * Nested CMS page paths for admin previews and parent dropdowns.
 */

export type PageHierarchyRow = {
  id: number;
  title: string;
  slug: string;
  parent_id?: number | null;
  path?: string | null;
  public_path?: string | null;
  depth?: number;
  exclude_from_search?: boolean;
};

export function nestedPagePath(parentPath: string | null | undefined, slug: string): string {
  const leaf = String(slug ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const parent = String(parentPath ?? '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  if (!leaf) {
    return parent;
  }
  if (!parent) {
    return leaf;
  }
  return `${parent}/${leaf}`;
}

export function parentSelectOptions<T extends PageHierarchyRow>(pages: T[], currentId?: number | null): T[] {
  const descendantIds = new Set<number>();
  if (currentId) {
    const collect = (id: number) => {
      for (const page of pages) {
        if (page.parent_id === id) {
          descendantIds.add(page.id);
          collect(page.id);
        }
      }
    };
    collect(currentId);
  }
  return pages.filter((page) => page.id !== currentId && !descendantIds.has(page.id));
}

export function parentOptionLabel(page: PageHierarchyRow): string {
  const depth = Math.max(0, Number(page.depth ?? 0));
  const prefix = depth > 0 ? `${'— '.repeat(depth)}` : '';
  return `${prefix}${page.title || page.slug}`;
}
