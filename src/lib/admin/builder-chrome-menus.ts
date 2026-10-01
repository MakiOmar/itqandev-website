/**
 * Real published menus for header/footer builder previews. The public API injects menu items
 * server-side (`ChromeLayoutSupport::injectMenuItems`); admin documents never carry them, so the
 * builder fetches the same `/public/menus/{slug}` tree the frontend uses.
 */
import { useSignal, useVisibleTask$, type Signal } from '@builder.io/qwik';
import { marketingGet } from '~/lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import type { PageLayoutBand, PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicNavItem } from '~/lib/marketing/public-menu';

export const CHROME_MENU_KIT_TYPES = new Set(['header_menu', 'footer_menu']);

export type ChromeMenuMap = Record<string, PublicNavItem[]>;

export function chromeMenuSlug(settings: Record<string, unknown> | undefined): string {
  const raw = String(settings?.menu_slug ?? 'primary').trim().toLowerCase();
  return raw || 'primary';
}

export function collectChromeMenuSlugs(nodes: PageSectionNode[] | PageLayoutBand[]): string[] {
  const slugs = new Set<string>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (typeof n.type === 'string' && CHROME_MENU_KIT_TYPES.has(n.type)) {
      slugs.add(chromeMenuSlug(n.settings as Record<string, unknown> | undefined));
    }
    for (const key of ['rows', 'columns', 'blocks'] as const) {
      if (Array.isArray(n[key])) (n[key] as unknown[]).forEach(visit);
    }
  };
  (nodes as unknown[]).forEach(visit);
  return [...slugs];
}

/**
 * Fetches each menu slug used by `sections` once per locale. Failed slugs stay absent so the
 * preview can fall back to sample links.
 */
export function useBuilderChromeMenus(
  sections: Signal<PageSectionNode[]>,
  locale: Signal<string>,
  enabled: boolean,
): Signal<ChromeMenuMap> {
  const menus = useSignal<ChromeMenuMap>({});
  const loadedLocale = useSignal('');

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const nodes = track(() => sections.value);
    const loc = track(() => locale.value);
    if (!enabled) return;
    if (loadedLocale.value !== loc) {
      loadedLocale.value = loc;
      menus.value = {};
    }
    const missing = collectChromeMenuSlugs(nodes).filter((slug) => !(slug in menus.value));
    if (missing.length === 0) return;
    const fetched = await Promise.all(
      missing.map(async (slug) => {
        try {
          const base = MARKETING_ENDPOINTS.menuBySlug(slug);
          const path = loc ? `${base}?locale=${encodeURIComponent(loc)}` : base;
          const data = await marketingGet<{ items?: PublicNavItem[] }>(path);
          return [slug, Array.isArray(data?.items) ? data.items : []] as const;
        } catch (error) {
          console.warn('[builder] menu preview fetch failed', slug, error);
          return null;
        }
      }),
    );
    const next = { ...menus.value };
    for (const entry of fetched) {
      if (entry) next[entry[0]] = entry[1];
    }
    menus.value = next;
  });

  return menus;
}
