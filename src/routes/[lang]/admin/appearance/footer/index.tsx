import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchFooterBuilderFromBrowser,
  formatAppearanceError,
  saveFooterBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
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
        text: formatAppearanceError(e, 'Failed to load footer builder'),
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
        text: result.message || 'Footer layout saved.',
      });
    } else {
      showError(translateApp(lang, 'common.error'), { text: result.error || 'Save failed' });
    }
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Footer builder</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Switch between the default footer and a zoned builder layout.
          </p>
        </div>
        <button
          type="button"
          disabled={saving.value || loading.value || !doc.value}
          onClick$={save}
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
        </button>
      </div>

      {loading.value || !doc.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : (
        <>
          <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <label class="mb-2 block text-sm font-medium">Footer mode</label>
            <select
              class="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
              value={doc.value.mode}
              onChange$={(e) => {
                const mode = (e.target as HTMLSelectElement).value as FooterMode;
                doc.value = { ...doc.value!, mode };
              }}
            >
              <option value="hardcoded">Default hardcoded footer</option>
              <option value="builder">Builder footer</option>
            </select>
            <p class="mt-2 text-xs text-gray-500">
              Hardcoded keeps the current marketing footer. Builder uses top / main / bottom zones.
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            {ZONE_KEYS.map((zone) => {
              const z = doc.value!.zones[zone] ?? { enabled: false, columns: [] };
              return (
                <div
                  key={zone}
                  class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                >
                  <h2 class="text-lg font-semibold capitalize text-gray-900 dark:text-white">{zone}</h2>
                  <label class="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={z.enabled}
                      onChange$={(e) => {
                        const checked = (e.target as HTMLInputElement).checked;
                        doc.value = {
                          ...doc.value!,
                          zones: {
                            ...doc.value!.zones,
                            [zone]: { ...z, enabled: checked },
                          },
                        };
                      }}
                    />
                    Enabled
                  </label>
                  <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {z.columns.length} column{z.columns.length === 1 ? '' : 's'}
                  </p>
                  <Link
                    href={`${R.ADMIN.APPEARANCE_FOOTER}/${zone}`}
                    class="mt-4 inline-block text-sm font-medium text-primary-600 hover:underline"
                  >
                    Edit columns
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

export const head: DocumentHead = {
  title: 'Footer builder',
};
