import { component$, useSignal, useVisibleTask$, type QRL } from '@builder.io/qwik';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
} from '~/lib/admin/native-select-classes';
import { translateApp } from '~/lib/i18n/useTranslate';

export type CategorySelectOption = {
  id: number;
  name: string;
  slug: string;
};

/** Unwrap ApiResponse / Laravel list / bare array into category rows. */
function unwrapListPayload(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  const root = body as Record<string, unknown>;
  // ApiClient shape: { success, data }
  if (Array.isArray(root.data)) return root.data;
  if (root.data && typeof root.data === 'object' && !Array.isArray(root.data)) {
    const nested = root.data as Record<string, unknown>;
    if (Array.isArray(nested.data)) return nested.data;
  }
  return [];
}

function normalizeCategoryOptions(body: unknown): CategorySelectOption[] {
  const out: CategorySelectOption[] = [];
  for (const row of unwrapListPayload(body)) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const id = Number(r.id);
    const name = String(r.name ?? '').trim();
    const slug = String(r.slug ?? '').trim();
    if (!id || !name) continue;
    out.push({ id, name, slug });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export type CategoryMultiSelectFieldProps = {
  lang: string;
  label: string;
  value: number[];
  onChange$: QRL<(ids: number[]) => void>;
  /** Optional preloaded options (e.g. page-builder preview categories). */
  initialOptions?: CategorySelectOption[];
};

/**
 * Admin checkbox list of project categories (stores numeric IDs in appearance settings).
 */
export const CategoryMultiSelectField = component$<CategoryMultiSelectFieldProps>((props) => {
  const seeded = props.initialOptions?.length
    ? normalizeCategoryOptions(props.initialOptions)
    : null;
  const options = useSignal<CategorySelectOption[] | null>(seeded);
  const error = useSignal('');

  // document-ready: do not wait for scroll into the inspector panel.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    async () => {
      if (options.value !== null && options.value.length > 0) {
        return;
      }
      error.value = '';
      try {
        const res = await getApiClient(null).get(API_ENDPOINTS.CATEGORIES.LIST);
        options.value = normalizeCategoryOptions(res);
      } catch (e) {
        if (options.value === null) {
          options.value = [];
        }
        error.value =
          e instanceof Error
            ? e.message
            : translateApp(props.lang, 'appearance.categoriesLoadFailed');
      }
    },
    { strategy: 'document-ready' },
  );

  const selected = new Set((props.value ?? []).map((id) => Number(id)).filter((id) => id > 0));

  return (
    <div
      class="md:col-span-2 rounded-lg border border-primary-200/80 bg-primary-50/40 p-3 dark:border-primary-900/60 dark:bg-primary-950/20"
      data-appearance-field="category_ids"
    >
      <label class="mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-100">
        {props.label}
      </label>
      <p class="mb-2 text-xs text-gray-600 dark:text-gray-400">
        {translateApp(props.lang, 'appearance.categoryMultiHint')}
      </p>
      {options.value === null ? (
        <p class="text-xs text-gray-500">{translateApp(props.lang, 'appearance.categoriesLoading')}</p>
      ) : error.value && options.value.length === 0 ? (
        <p class="text-xs text-red-600 dark:text-red-400">{error.value}</p>
      ) : options.value.length === 0 ? (
        <p class="text-xs text-gray-500">{translateApp(props.lang, 'appearance.noCategories')}</p>
      ) : (
        <ul
          class="grid max-h-56 gap-2 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-slate-900"
          role="list"
        >
          {options.value.map((cat) => (
            <li key={cat.id}>
              <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
                <input
                  type="checkbox"
                  class={ADMIN_CHECKBOX_CLASS}
                  checked={selected.has(cat.id)}
                  onChange$={async (e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    const next = (props.value ?? [])
                      .map((id) => Number(id))
                      .filter((id) => id > 0 && id !== cat.id);
                    if (checked) {
                      next.push(cat.id);
                    }
                    await props.onChange$(next);
                  }}
                />
                <span>{cat.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
