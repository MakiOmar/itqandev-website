import { $, useSignal, useTask$, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import { uiLangFromUrlPathname, uiLangPrefixFromPathname } from '../i18n/ui-locale-path';

interface UseLocaleAwareListResult<T> {
  items: Signal<T[]>;
  loading: Signal<boolean>;
  refetch: QRL<(locale: string) => Promise<void>>;
}

/** Route loader (or any reactive source) exposing `.value` for the initial list payload */
export type LocaleAwareListLoader<T> = {
  readonly value: T[] | undefined;
};

/**
 * Keeps list content consistent with the current UI locale.
 * On locale change, clears items immediately (hides table/cards) and refetches.
 * Pass the route loader object (not `.value`) so when the loader resolves after SPA navigation,
 * the list updates — `useSignal(initial)` alone only captures the first render.
 *
 * Presentation locale for API calls prefers the `/en`/`/ar` URL segment (stable during SPA
 * navigation). `useSpeakLocale()` can disagree briefly with the path while cookies sync.
 */
export function useLocaleAwareList<T>(
  initialLoader: LocaleAwareListLoader<T>,
  fetchForLocale$: QRL<(locale: string) => Promise<T[]>>,
): UseLocaleAwareListResult<T> {
  const locale = useSpeakLocale();
  const location = useLocation();
  const initialSnapshot = initialLoader.value;
  const items = useSignal<T[]>(Array.isArray(initialSnapshot) ? [...initialSnapshot] : []);
  const loading = useSignal(false);
  const lastFetchedLocale = useSignal<string | null>(null);
  const lastPathname = useSignal<string | null>(null);
  const fetchGeneration = useSignal(0);

  // Server only: hydrate from the route loader.
  useTask$(({ track }) => {
    if (!isServer) {
      return;
    }
    const next = track(() => initialLoader.value);
    if (next === undefined) {
      return;
    }
    items.value = Array.isArray(next) ? [...next] : [];
  });

  const refetch = $(async (explicitLocale: string) => {
    const loc = String(explicitLocale || 'en').toLowerCase();
    const generation = ++fetchGeneration.value;
    loading.value = true;
    items.value = [];
    try {
      const next = await fetchForLocale$(loc);
      if (generation !== fetchGeneration.value) {
        return;
      }
      items.value = next;
      lastFetchedLocale.value = loc;
    } finally {
      if (generation === fetchGeneration.value) {
        loading.value = false;
      }
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const pathname = track(() => location.url.pathname);
    track(() => locale.lang);

    const urlLocale = uiLangPrefixFromPathname(pathname) != null
      ? uiLangFromUrlPathname(pathname)
      : String(locale.lang || 'en').toLowerCase();

    const pathnameChanged = lastPathname.value !== pathname;
    const localeChanged = lastFetchedLocale.value !== urlLocale;

    if (!pathnameChanged && !localeChanged && lastFetchedLocale.value !== null) {
      return;
    }

    lastPathname.value = pathname;
    void refetch(urlLocale);
  });

  return { items, loading, refetch };
}
