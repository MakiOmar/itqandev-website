import type { ChromeLayoutKind } from '~/types/chrome-layout';

type TagLike = { group?: string };

/**
 * Tag groups a builder kind can resolve on the site. `record` tags only have a value inside
 * a single / loop item template and `archive` tags only on archives, so headers, footers,
 * bodies and overlays offer site tags alone (tokens already saved keep rendering).
 */
const GROUPS_BY_KIND: Record<ChromeLayoutKind, readonly string[]> = {
  header: ['site'],
  footer: ['site'],
  body: ['site'],
  overlay: ['site'],
  single: ['site', 'record'],
  loop_item: ['site', 'record'],
  archive: ['site', 'archive'],
};

export function dynamicTagsForChromeKind<T extends TagLike>(tags: readonly T[], kind: ChromeLayoutKind): T[] {
  const groups = GROUPS_BY_KIND[kind] ?? ['site'];
  return tags.filter((tag) => groups.includes(tag.group || 'site'));
}
