import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { appearanceZoneLabel } from '~/lib/i18n/appearance-labels';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchFooterBuilderFromBrowser,
  formatAppearanceError,
  saveFooterBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import { BuilderImportExportButtons } from '~/components/admin/BuilderImportExportButtons';
import type { FooterBuilderExportDocument } from '~/lib/admin/builder-import-export';
import type { FooterBuilderDocument, FooterMode } from '~/lib/marketing/appearance-types';

const ZONE_KEYS = ['top', 'main', 'bottom'] as const;

export default component$(() => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const doc = useSignal<FooterBuilderDocument | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      doc.value = await fetchFooterBuilderFromBrowser();
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'appearance.footerLoadFailed')),
      });
    } finally {
      loading.value = false;
    }
  });

  const save = $(async () => {
    if (!doc.value) return;
    saving.value = true;
    const result = await saveFooterBuilderFromBrowser(doc.value);
    saving.value = false;
    if (result.success) {
      if (result.data) doc.value = result.data;
      showSuccess(translateApp(lang, 'common.success'), {
        text: result.message || translateApp(lang, 'appearance.footerSaved'),
      });
    } else {
      showError(translateApp(lang, 'common.error'), {
        text: result.error || translateApp(lang, 'appearance.saveFailed'),
      });
    }
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0 flex-1 text-start">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
            {translateApp(lang, 'appearance.footerTitle')}
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {translateApp(lang, 'appearance.footerSubtitle')}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <BuilderImportExportButtons
            lang={lang}
            builder="footer"
            filenameBase="footer"
            disabled={saving.value || loading.value || !doc.value}
            getDocument$={$(() => doc.value)}
            applyDocument$={$((document) => {
              doc.value = document as FooterBuilderExportDocument;
            })}
          />
          <button
            type="button"
            disabled={saving.value || loading.value || !doc.value}
            onClick$={save}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
          </button>
        </div>
      </div>

      {loading.value || !doc.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : (
        <>
          <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <label class="mb-2 block text-sm font-medium text-start">
              {translateApp(lang, 'appearance.footerMode')}
            </label>
            <select
              class="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
              value={doc.value.mode}
              onChange$={(e) => {
                const mode = (e.target as HTMLSelectElement).value as FooterMode;
                doc.value = { ...doc.value!, mode };
              }}
            >
              <option value="hardcoded">{translateApp(lang, 'appearance.footerModeHardcoded')}</option>
              <option value="builder">{translateApp(lang, 'appearance.footerModeBuilder')}</option>
            </select>
            <p class="mt-2 text-xs text-gray-500 text-start">
              {translateApp(lang, 'appearance.footerModeHelp')}
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            {ZONE_KEYS.map((zone) => {
              const z = doc.value!.zones[zone] ?? { enabled: false, columns: [] };
              const count = z.columns.length;
              return (
                <div
                  key={zone}
                  class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <h2 class="text-lg font-semibold text-start text-gray-900 dark:text-white">
                    {appearanceZoneLabel(lang, zone)}
                  </h2>
                  <div class="mt-3">
                    <AdminSwitch
                      checked={z.enabled}
                      label={translateApp(lang, 'appearance.enabled')}
                      onChange$={(checked) => {
                        doc.value = {
                          ...doc.value!,
                          zones: {
                            ...doc.value!.zones,
                            [zone]: { ...z, enabled: checked },
                          },
                        };
                      }}
                    />
                  </div>
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400 text-start">
                    {count === 1
                      ? translateApp(lang, 'appearance.columnCountOne')
                      : translateApp(lang, 'appearance.columnsCount', { count })}
                  </p>
                  <Link
                    href={`${R.ADMIN.APPEARANCE_FOOTER}/${zone}`}
                    class="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline"
                  >
                    {translateApp(lang, 'appearance.editColumns')}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = ({ params }) => {
  const lang = typeof params?.lang === 'string' ? params.lang : 'en';
  return {
    title: translateApp(lang, 'appearance.footerTitle'),
  };
};
