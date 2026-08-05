import { component$, useSignal, useVisibleTask$, type QRL } from '@builder.io/qwik';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';
import { translateApp } from '~/lib/i18n/useTranslate';

export type FormSelectOption = {
  id: number;
  title: string;
  slug: string;
  status: string;
};

function normalizeFormOptions(body: unknown): FormSelectOption[] {
  const rows = Array.isArray(body)
    ? body
    : body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data
      : [];
  const out: FormSelectOption[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const slug = String(r.slug ?? '').trim();
    if (!slug) continue;
    out.push({
      id: Number(r.id) || 0,
      title: String(r.title ?? slug),
      slug,
      status: String(r.status ?? 'draft'),
    });
  }
  return out;
}

export type FormSlugSelectFieldProps = {
  lang: string;
  label: string;
  value: string;
  onChange$: QRL<(slug: string) => void>;
};

/**
 * Admin select of published CMS forms (slug stored in appearance/page settings).
 * Keeps a non-published current slug in the list so existing embeds are not wiped.
 */
export const FormSlugSelectField = component$<FormSlugSelectFieldProps>((props) => {
  const options = useSignal<FormSelectOption[] | null>(null);
  const error = useSignal('');

  useVisibleTask$(async () => {
    error.value = '';
    try {
      const res = await getApiClient(null).get(API_ENDPOINTS.FORMS.LIST);
      options.value = normalizeFormOptions(res);
    } catch (e) {
      options.value = [];
      error.value = e instanceof Error ? e.message : translateApp(props.lang, 'appearance.formsLoadFailed');
    }
  });

  const current = props.value.trim();
  const published = (options.value ?? []).filter((f) => f.status === 'published');
  const currentRow = (options.value ?? []).find((f) => f.slug === current);
  const list =
    current && currentRow && currentRow.status !== 'published'
      ? [...published, currentRow]
      : published;
  const missingCurrent = Boolean(current) && !list.some((f) => f.slug === current);

  return (
    <div class="md:col-span-2">
      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {props.label}
      </label>
      {options.value === null ? (
        <p class="text-xs text-gray-500">{translateApp(props.lang, 'appearance.formsLoading')}</p>
      ) : (
        <select
          class={ADMIN_NATIVE_SELECT_CLASS}
          value={current}
          onChange$={async (e) => {
            await props.onChange$((e.target as HTMLSelectElement).value);
          }}
        >
          <option value="" class={ADMIN_NATIVE_OPTION_CLASS}>
            {translateApp(props.lang, 'appearance.selectForm')}
          </option>
          {missingCurrent ? (
            <option value={current} class={ADMIN_NATIVE_OPTION_CLASS}>
              {current} ({translateApp(props.lang, 'appearance.formUnavailable')})
            </option>
          ) : null}
          {list.map((f) => (
            <option key={f.id || f.slug} value={f.slug} class={ADMIN_NATIVE_OPTION_CLASS}>
              {f.title}
              {f.slug ? ` (${f.slug})` : ''}
              {f.status !== 'published'
                ? ` — ${translateApp(props.lang, 'appearance.formNotPublished')}`
                : ''}
            </option>
          ))}
        </select>
      )}
      {error.value ? <p class="mt-1 text-xs text-red-600">{error.value}</p> : null}
      {!error.value && options.value !== null && published.length === 0 ? (
        <p class="mt-1 text-xs text-gray-500">{translateApp(props.lang, 'appearance.noPublishedForms')}</p>
      ) : null}
    </div>
  );
});
