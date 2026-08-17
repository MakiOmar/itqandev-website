import { component$ } from '@builder.io/qwik';
import type { Signal } from '@builder.io/qwik';
import { translateApp } from '../../../lib/i18n/useTranslate';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '../../../lib/admin/native-select-classes';
import {
  parentOptionLabel,
  type PageHierarchyRow,
} from '../../../lib/admin/page-hierarchy';

export type PageHierarchyFieldsProps = {
  lang: string;
  parentId: Signal<number | null>;
  excludeFromSearch: Signal<boolean>;
  parentOptions: PageHierarchyRow[];
  /** Unique id prefix so create/edit forms do not clash. */
  idPrefix: string;
};

/**
 * Parent page + exclude-from-search controls for the publish sidebar.
 */
export const PageHierarchyFields = component$((props: PageHierarchyFieldsProps) => {
  const { lang, parentId, excludeFromSearch, parentOptions, idPrefix } = props;

  return (
    <div class="space-y-3">
      <div>
        <label for={`${idPrefix}-parent`} class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(lang, 'pages.fields.parent')}
        </label>
        <select
          id={`${idPrefix}-parent`}
          class={ADMIN_NATIVE_SELECT_CLASS}
          value={parentId.value == null ? '' : String(parentId.value)}
          onChange$={(e) => {
            const raw = (e.target as HTMLSelectElement).value;
            parentId.value = raw === '' ? null : Number(raw);
          }}
        >
          <option class={ADMIN_NATIVE_OPTION_CLASS} value="">
            {translateApp(lang, 'pages.parentNone')}
          </option>
          {parentOptions.map((page) => (
            <option key={page.id} class={ADMIN_NATIVE_OPTION_CLASS} value={String(page.id)}>
              {parentOptionLabel(page)}
            </option>
          ))}
        </select>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {translateApp(lang, 'pages.parentHint')}
        </p>
      </div>
      <label class={ADMIN_CHECKBOX_LABEL_CLASS} for={`${idPrefix}-exclude-search`}>
        <input
          id={`${idPrefix}-exclude-search`}
          type="checkbox"
          class={ADMIN_CHECKBOX_CLASS}
          checked={excludeFromSearch.value}
          onChange$={(e) => {
            excludeFromSearch.value = (e.target as HTMLInputElement).checked;
          }}
        />
        <span>{translateApp(lang, 'pages.fields.excludeFromSearch')}</span>
      </label>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {translateApp(lang, 'pages.excludeFromSearchHint')}
      </p>
    </div>
  );
});
