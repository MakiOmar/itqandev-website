import { $, useSignal, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import type { TaxonomyListOptions } from '../admin/taxonomy-list-options';
import { uiLangFromUrlPathname, uiLangPrefixFromPathname } from '../i18n/ui-locale-path';

interface UseLocaleAwareTaxonomyOptionsResult {
  options: Signal<TaxonomyListOptions>;
  loading: Signal<boolean>;
}

type TaxonomyLoader = {
  readonly value: TaxonomyListOptions;
};

/**
 * Keeps category/skill pickers aligned with the current dashboard UI locale (SPA language switch).
 */
export function useLocaleAwareTaxonomyOptions(
  initialLoader: TaxonomyLoader,
  fetchForLocale$: QRL<(locale: string) => Promise<TaxonomyListOptions>>,
): UseLocaleAwareTaxonomyOptionsResult {
  const locale = useSpeakLocale();
  const location = useLocation();
  const snapshot = initialLoader.value;
  const options = useSignal<TaxonomyListOptions>({
    categories: Array.isArray(snapshot?.categories) ? [...snapshot.categories] : [],
    skills: Array.isArray(snapshot?.skills) ? [...snapshot.skills] : [],
  });
  const loading = useSignal(false);
  const lastFetchedLocale = useSignal<string | null>(null);
  const lastPathname = useSignal<string | null>(null);
  const fetchGeneration = useSignal(0);

  const refetch = $(async (explicitLocale: string) => {
    const loc = String(explicitLocale || 'en').toLowerCase();
    const generation = ++fetchGeneration.value;
    loading.value = true;
    try {
      const next = await fetchForLocale$(loc);
      if (generation !== fetchGeneration.value) {
        return;
      }
      options.value = next;
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

  return { options, loading };
}
