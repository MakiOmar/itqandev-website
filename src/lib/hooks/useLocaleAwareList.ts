import { $, useSignal, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { useSpeakLocale } from 'qwik-speak';

interface UseLocaleAwareListResult<T> {
  items: Signal<T[]>;
  loading: Signal<boolean>;
  refetch: QRL<() => Promise<void>>;
}

/**
 * Keeps list content consistent with the current UI locale.
 * On locale change, clears items immediately (hides table/cards) and refetches.
 */
export function useLocaleAwareList<T>(
  initialItems: T[],
  fetchForLocale$: QRL<(locale: string) => Promise<T[]>>,
): UseLocaleAwareListResult<T> {
  const locale = useSpeakLocale();
  const items = useSignal<T[]>(initialItems);
  const loading = useSignal(false);
  const lastLocale = useSignal<string>(String(locale.lang || 'en'));

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

