import { getApiClient } from '../api/client';
import type { AddonNavItem } from './types';

/** Label in the UI locale, else English, else the first one the addon provided. */
export function addonNavLabel(item: AddonNavItem, lang: string): string {
  return item.label[lang] ?? item.label.en ?? Object.values(item.label)[0] ?? item.module;
}

function isAddonNavItem(value: unknown): value is AddonNavItem {
  const v = value as Partial<AddonNavItem> | null;
  return !!v && typeof v.href === 'string' && typeof v.module === 'string' && typeof v.label === 'object';
}

/** Links filtered by the user's permissions, for editors who cannot read GET /api/settings. */
export async function fetchAddonNavFromBrowser(): Promise<AddonNavItem[]> {
  try {
    const res = await getApiClient(null).get<AddonNavItem[] | { data?: AddonNavItem[] }>('/me/addon-nav');
    const body = res.data;
    const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
    return list.filter(isAddonNavItem);
  } catch {
    return [];
  }
}
