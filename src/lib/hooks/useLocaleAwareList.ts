import { $, useSignal, useTask$, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
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
 *
 * On the **client**, do not copy the route loader into `items`: the loader uses `preferred-locale`
 * from the request cookie for `X-Content-Locale`, while `useSpeakLocale()` can match `localStorage`
 * after `root.tsx` runs — they can disagree (e.g. English UI with Arabic list). The visible-task
 * refetch always sends an explicit locale and owns list data on the browser.
 */
export function useLocaleAwareList<T>(
  initialLoader: LocaleAwareListLoader<T>,
  fetchForLocale$: QRL<(locale: string) => Promise<T[]>>,
): UseLocaleAwareListResult<T> {
  const locale = useSpeakLocale();
  const initialSnapshot = initialLoader.value;
  const items = useSignal<T[]>(Array.isArray(initialSnapshot) ? [...initialSnapshot] : []);
  const loading = useSignal(false);
  /** `null` until first client refetch so we always align with `useSpeakLocale()` once. */
  const lastLocale = useSignal<string | null>(null);

  // Server only: hydrate from the route loader. On the client, avoid overwriting refetched rows
  // with loader data that may use a different locale source than `useSpeakLocale()`.
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
    if (lastLocale.value !== null && current === lastLocale.value) {
      return;
    }
    lastLocale.value = current;
    refetch();
  });

  return { items, loading, refetch };
}

