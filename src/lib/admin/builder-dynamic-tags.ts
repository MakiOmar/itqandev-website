import type {
  AppearanceRegistries,
  DynamicTag,
  DynamicTagCatalog,
  DynamicTagGroup,
  DynamicTagScope,
} from '~/lib/admin/appearance-actions';
import type { ChromeLayoutKind } from '~/types/chrome-layout';

/**
 * Tag scopes a builder kind can resolve on the site. `record` tags only have a value inside
 * a single / loop item template and `archive` tags only on archives, so headers, footers,
 * bodies and overlays offer site tags alone (tokens already saved keep rendering).
 */
const SCOPES_BY_KIND: Record<ChromeLayoutKind, readonly DynamicTagScope[]> = {
  header: ['site'],
  footer: ['site'],
  body: ['site'],
  overlay: ['site'],
  single: ['site', 'record'],
  loop_item: ['site', 'record'],
  archive: ['site', 'archive'],
};

export function dynamicTagCatalogFromRegistries(
  regs: Pick<AppearanceRegistries, 'dynamic_tags' | 'dynamic_tag_groups'>,
): DynamicTagCatalog {
  return { tags: regs.dynamic_tags ?? [], groups: regs.dynamic_tag_groups ?? [] };
}

function filterCatalog(catalog: DynamicTagCatalog, keep: (group: DynamicTagGroup) => boolean): DynamicTagCatalog {
  const groups = catalog.groups.filter(keep);
  const ids = new Set(groups.map((group) => group.id));
  const tags = catalog.tags.filter((tag: DynamicTag) => ids.has(tag.group || 'site'));
  return { tags, groups };
}

export function dynamicTagCatalogForChromeKind(catalog: DynamicTagCatalog, kind: ChromeLayoutKind): DynamicTagCatalog {
  const scopes = SCOPES_BY_KIND[kind] ?? ['site'];
  return filterCatalog(catalog, (group) => scopes.includes(group.scope));
}

/** Homepage sections render without a current record, so only site tags resolve. */
export function dynamicTagCatalogForSite(catalog: DynamicTagCatalog): DynamicTagCatalog {
  return filterCatalog(catalog, (group) => group.scope === 'site');
}

/** A CMS page's own layout resolves record tags against that page, never another content type. */
export function dynamicTagCatalogForCmsPage(catalog: DynamicTagCatalog): DynamicTagCatalog {
  return filterCatalog(
    catalog,
    (group) =>
      (group.scope === 'site' || group.scope === 'record') &&
      (group.content_type === null || group.content_type === 'page'),
  );
}
