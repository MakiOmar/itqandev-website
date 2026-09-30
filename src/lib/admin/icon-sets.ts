import lucideIconsUrl from '@iconify-json/lucide/icons.json?url';
import type { IconSetLibrary, SetIconValue } from '~/lib/icons/icon-value';

type IconifyJson = {
  width?: number;
  height?: number;
  icons: Record<string, { body: string; width?: number; height?: number }>;
};

export type LoadedIconSet = {
  names: string[];
  icon: (name: string) => SetIconValue | null;
};

/** Admin-only: the set JSON is a hashed static asset on our own origin, fetched on first picker open. */
const SET_URLS: Record<IconSetLibrary, string> = {
  lucide: lucideIconsUrl,
};

const cache = new Map<IconSetLibrary, Promise<LoadedIconSet>>();

export function loadIconSet(library: IconSetLibrary): Promise<LoadedIconSet> {
  let pending = cache.get(library);
  if (!pending) {
    pending = fetch(SET_URLS[library])
      .then((res) => {
        if (!res.ok) throw new Error(`Icon set ${library} failed to load (${res.status})`);
        return res.json() as Promise<IconifyJson>;
      })
      .then((json) => ({
        names: Object.keys(json.icons).sort(),
        icon: (name: string) => {
          const row = json.icons[name];
          if (!row) return null;
          const w = row.width ?? json.width ?? 24;
          const h = row.height ?? json.height ?? 24;
          return { library, name, body: row.body, view_box: `0 0 ${w} ${h}` };
        },
      }));
    pending.catch(() => cache.delete(library));
    cache.set(library, pending);
  }
  return pending;
}
