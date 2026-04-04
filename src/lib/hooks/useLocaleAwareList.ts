import { $, useSignal, useTask$, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { useSpeakLocale } from 'qwik-speak';

interface UseLocaleAwareListResult<T> {
  items: Signal<T[]>;
  loading: Signal<boolean>;
  refetch: QRL<() => Promise<void>>;
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
 */
export function useLocaleAwareList<T>(
  initialLoader: LocaleAwareListLoader<T>,
  fetchForLocale$: QRL<(locale: string) => Promise<T[]>>,
): UseLocaleAwareListResult<T> {
  const locale = useSpeakLocale();
  const initialSnapshot = initialLoader.value;
  const items = useSignal<T[]>(Array.isArray(initialSnapshot) ? [...initialSnapshot] : []);
  const loading = useSignal(false);
  const lastLocale = useSignal<string>(String(locale.lang || 'en'));

  // Sync when routeLoader.value updates (client-side navigation); do not track locale here
  // so locale-driven refetch results are not overwritten by stale SSR loader data.
  useTask$(({ track }) => {
    const next = track(() => initialLoader.value);
    if (next === undefined) {
      return;
    }
    items.value = Array.isArray(next) ? [...next] : [];
  });

  const refetch = $(async () => {
    const loc = String(locale.lang || 'en').toLowerCase();
    loading.value = true;
    items.value = [];
    try {
      const next = await fetchForLocale$(loc);
      items.value = next;
    } finally {
      loading.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const current = String(track(() => locale.lang) || 'en').toLowerCase();
    if (current === String(lastLocale.value || '').toLowerCase()) {
      return;
    }
    lastLocale.value = current;
    refetch();
  });

  return { items, loading, refetch };
}

