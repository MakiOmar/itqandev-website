import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import {
  filterLocaleOptions,
  getLocaleOptionByCode,
  type LocaleOption,
} from '../../lib/i18n/locale-options';

export interface SearchableLocaleSelectProps {
  /** Current locale code (lowercase BCP-47). */
  selectedCode: string;
  /** Codes selected on other rows (cannot pick duplicate). */
  excludeCodes: string[];
  /** Visible label above control */
  fieldLabel: string;
  /** Input placeholder when dropdown is open */
  searchPlaceholder: string;
  /** Summary when no code is set */
  emptyHint: string;
  /** Shown when search returns no rows */
  noResultsText: string;
  onSelect$: QRL<(opt: LocaleOption) => void>;
}

/**
 * Searchable dropdown of standard locales for admin language code selection.
 */
export const SearchableLocaleSelect = component$<SearchableLocaleSelectProps>((props) => {
  const open = useSignal(false);
  const query = useSignal('');
  const blurTimer = useSignal<ReturnType<typeof setTimeout> | null>(null);

  const clearBlurTimer = $(() => {
    if (blurTimer.value !== null) {
      clearTimeout(blurTimer.value);
      blurTimer.value = null;
    }
  });

  const scheduleClose = $(() => {
    clearBlurTimer();
    blurTimer.value = setTimeout(() => {
      open.value = false;
      query.value = '';
    }, 180);
  });

  const openList = $(() => {
    clearBlurTimer();
    open.value = true;
    query.value = '';
  });

  const pick = $((opt: LocaleOption) => {
    clearBlurTimer();
    props.onSelect$(opt);
    open.value = false;
    query.value = '';
  });

  const current = getLocaleOptionByCode(props.selectedCode);
  const summary = current
    ? `${current.label} (${current.code})`
    : props.selectedCode
      ? props.selectedCode
      : props.emptyHint;

  const excluded = props.excludeCodes ?? [];
  const matches = filterLocaleOptions(open.value ? query.value : '', excluded, 100);

  return (
    <div class="relative">
      <span class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{props.fieldLabel}</span>

      {!open.value ? (
        <button
          type="button"
          onClick$={openList}
          class="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-900 shadow-sm hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100 dark:focus:ring-primary-700/40"
        >
          <span class="truncate">{summary}</span>
          <span class="shrink-0 text-gray-400" aria-hidden="true">
            ▾
          </span>
        </button>
      ) : (
        <div class="rounded-lg border border-primary-300 bg-white shadow-md dark:border-primary-700 dark:bg-gray-950">
          <input
            type="search"
            autofocus
            placeholder={props.searchPlaceholder}
            value={query.value}
            onInput$={(e: Event) => {
              query.value = (e.target as HTMLInputElement).value;
            }}
            onFocus$={clearBlurTimer}
            onBlur$={scheduleClose}
            class="w-full rounded-t-lg border-0 border-b border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          />
          <ul
            class="max-h-60 overflow-y-auto py-1 text-sm"
            role="listbox"
            onMouseDown$={(e: Event) => e.preventDefault()}
          >
            {matches.length === 0 ? (
              <li class="px-3 py-2 text-gray-500 dark:text-gray-400">
                {query.value.trim() ? props.noResultsText : props.emptyHint}
              </li>
            ) : (
              matches.map((opt) => (
                <li key={opt.code} role="option">
                  <button
                    type="button"
                    class="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-primary-50 dark:hover:bg-primary-950/40"
                    onClick$={() => pick(opt)}
                  >
                    <span class="font-medium text-gray-900 dark:text-gray-100">{opt.label}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400">
                      {opt.native} · {opt.code}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
});
