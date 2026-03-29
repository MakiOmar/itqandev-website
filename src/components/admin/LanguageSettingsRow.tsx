import { component$, $, type QRL } from '@builder.io/qwik';
import { SearchableLocaleSelect } from './SearchableLocaleSelect';
import type { LocaleOption } from '../../lib/i18n/locale-options';
import type { SiteLanguageRow } from '../../types/site-language';

export interface LanguageSettingsRowStrings {
  fieldLabel: string;
  searchPlaceholder: string;
  emptyHint: string;
  noResultsText: string;
  rtl: string;
  languageLabel: string;
  languageNative: string;
  removeLanguage: string;
}

export interface LanguageSettingsRowProps {
  index: number;
  /** Mutable store array from parent */
  items: SiteLanguageRow[];
  excludeCodes: string[];
  rowTitle: string;
  removeDisabled: boolean;
  strings: LanguageSettingsRowStrings;
  syncJson: QRL<() => void>;
  /** Shared handler; row passes its index when remove is clicked */
  onRemove$: QRL<(index: number) => void>;
}

/**
 * One language row on the site settings page. Lives in its own component so QRLs
 * do not close over qwik-speak's translate function (SSR serialization).
 */
export const LanguageSettingsRow = component$<LanguageSettingsRowProps>((props) => {
  /* RTL flag is stored for the public site and dashboard chrome only — keep this form LTR. */
  return (
    <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-sm font-medium text-gray-700 dark:text-gray-200">{props.rowTitle}</span>
        <button
          type="button"
          disabled={props.removeDisabled}
          onClick$={$(() => {
            props.onRemove$(props.index);
          })}
          class="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          {props.strings.removeLanguage}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <SearchableLocaleSelect
            selectedCode={props.items[props.index].code}
            excludeCodes={props.excludeCodes}
            fieldLabel={props.strings.fieldLabel}
            searchPlaceholder={props.strings.searchPlaceholder}
            emptyHint={props.strings.emptyHint}
            noResultsText={props.strings.noResultsText}
            onSelect$={$((opt: LocaleOption) => {
              const idx = props.index;
              props.items[idx].code = opt.code;
              props.items[idx].label = opt.label;
              props.items[idx].native_label = opt.native;
              props.syncJson();
            })}
          />
        </div>
        <div class="flex items-end gap-2 pb-1">
          <input
            id={`rtl-${props.index}`}
            type="checkbox"
            checked={props.items[props.index].rtl}
            onChange$={$((e: Event) => {
              const idx = props.index;
              props.items[idx].rtl = (e.target as HTMLInputElement).checked;
              props.syncJson();
            })}
            class="h-4 w-4 rounded border-gray-300 text-primary-600"
          />
          <label for={`rtl-${props.index}`} class="text-sm text-gray-700 dark:text-gray-200">
            {props.strings.rtl}
          </label>
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {props.strings.languageLabel}
          </label>
          <input
            type="text"
            value={props.items[props.index].label}
            onInput$={$((e: Event) => {
              const idx = props.index;
              props.items[idx].label = (e.target as HTMLInputElement).value;
              props.syncJson();
            })}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
        <div class="md:col-span-2">
          <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
            {props.strings.languageNative}
          </label>
          <input
            type="text"
            value={props.items[props.index].native_label}
            onInput$={$((e: Event) => {
              const idx = props.index;
              props.items[idx].native_label = (e.target as HTMLInputElement).value;
              props.syncJson();
            })}
            class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
          />
        </div>
      </div>
    </div>
  );
});
