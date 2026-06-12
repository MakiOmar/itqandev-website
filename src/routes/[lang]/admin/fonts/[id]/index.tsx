import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { FontFormFields } from '../../../../../components/admin/FontFormFields';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../lib/hooks/useSwal';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../lib/api/endpoints';
import { updateFont } from '../../../../../lib/admin/font-api';
import { useAppRoutes } from '../../../../../lib/constants/routes';
import { fontFormFromRecord, presentFontFormats, type SiteFont } from '../../../../../types/font';

function mapFont(raw: Record<string, unknown>): SiteFont {
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ''),
    css_family: String(raw.css_family ?? ''),
    file_woff2: (raw.file_woff2 as string | null) ?? null,
    file_woff: (raw.file_woff as string | null) ?? null,
    file_ttf: (raw.file_ttf as string | null) ?? null,
    file_eot: (raw.file_eot as string | null) ?? null,
    file_svg: (raw.file_svg as string | null) ?? null,
  };
}

export const useFontForEdit = routeLoader$(async ({ params, cookie, request, fail, redirect: redirectFn }) => {
  const id = String(params.id ?? '').trim();
  if (id === 'new') {
    throw redirectFn(302, '../new');
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get<Record<string, unknown>>(API_ENDPOINTS.FONTS.GET(id));
    const body = (res as { data?: unknown })?.data ?? res;
    const raw = body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
    if (!raw?.id) {
      throw fail(404, { message: 'Font not found' });
    }
    return mapFont(raw);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'status' in e) {
      throw e;
    }
    throw fail(404, { message: 'Font not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const fontLoader = useFontForEdit();
  const { success, error: showError } = useSwal();
  const saving = useSignal(false);
  const form = useSignal(fontFormFromRecord(fontLoader.value));

  const handleSave = $(async () => {
    if (!form.value.name.trim() || !form.value.css_family.trim()) {
      await showError(String(translateApp(lang, 'fonts.validationRequired')));
      return;
    }
    if (presentFontFormats(form.value).length === 0) {
      await showError(String(translateApp(lang, 'fonts.validationFile')));
      return;
    }
    saving.value = true;
    try {
      await updateFont(fontLoader.value.id, form.value);
      await success(String(translateApp(lang, 'settings.saveSuccess')));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(translateApp(lang, 'fonts.saveFailed'));
      await showError(msg);
    } finally {
      saving.value = false;
    }
  });

  return (
    <div>
      <PageHeader
        title={translateApp(lang, 'fonts.edit')}
        description={fontLoader.value.name}
      />
      <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
        <FontFormFields
          form={form.value}
          onChange$={$((next) => {
            form.value = next;
          })}
        />
        <div class="mt-6 flex justify-end gap-2">
          <Link
            href={R.ADMIN.FONTS}
            class="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
          >
            {translateApp(lang, 'common.back')}
          </Link>
          <button
            type="button"
            disabled={saving.value}
            onClick$={handleSave}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.update')}
          </button>
        </div>
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Edit Font - Dashboard',
};
