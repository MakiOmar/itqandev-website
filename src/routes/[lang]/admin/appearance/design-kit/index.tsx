import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { PageHeader } from '~/components/common/PageHeader';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { KIT_BASE_COLORS } from '~/lib/marketing/design-kit';
import {
  DesignKitBackgroundEditor,
  normalizePageBackgrounds,
  type PageBackgrounds,
} from '~/components/admin/appearance/DesignKitBackgroundEditor';
import {
  ADMIN_FORM_CARD_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';

type KitBaseColor = (typeof KIT_BASE_COLORS)[number];

type DesignKit = {
  colors: Record<KitBaseColor, string> & {
    custom?: { id: string; name: string; value: string }[];
  };
  /** Dark values by colour id; a missing id means "same as light". */
  colors_dark?: Record<string, string>;
  /** Site-wide page background per theme mode. */
  background: PageBackgrounds;
  type_roles: Record<string, { weight: string; size: string; line_height: string }>;
};

type ColorRow = { id: string; name: string; light: string; editableLight: boolean };

function colorRows(kit: DesignKit): ColorRow[] {
  return [
    ...KIT_BASE_COLORS.map((id) => ({ id, name: id, light: kit.colors[id], editableLight: true })),
    ...(kit.colors.custom ?? []).map((t) => ({ id: t.id, name: t.name || t.id, light: t.value, editableLight: false })),
  ];
}

export default component$(() => {
  const { lang } = useTranslate();
  const { success, error: showError } = useSwal();
  const kit = useSignal<DesignKit | null>(null);
  const saving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const res = await getApiClient(null).get<DesignKit>(API_ENDPOINTS.APPEARANCE.DESIGN_KIT);
      const loaded = ((res as { data?: DesignKit }).data ?? res) as DesignKit;
      kit.value = { ...loaded, background: normalizePageBackgrounds(loaded.background) };
    } catch (e) {
      showError(translateApp(lang, 'common.error'), { text: String((e as Error).message || '') });
    }
  });

  const setLight$ = $((id: KitBaseColor, next: string) => {
    if (!kit.value || !next) return;
    kit.value = { ...kit.value, colors: { ...kit.value.colors, [id]: next } };
  });

  const setDark$ = $((id: string, next: string) => {
    if (!kit.value) return;
    const dark = { ...(kit.value.colors_dark ?? {}) };
    if (next) dark[id] = next;
    else delete dark[id];
    kit.value = { ...kit.value, colors_dark: dark };
  });

  const setBackground$ = $((next: PageBackgrounds) => {
    if (!kit.value) return;
    kit.value = { ...kit.value, background: next };
  });

  const onSave$ = $(async () => {
    if (!kit.value) return;
    saving.value = true;
    try {
      const res = await getApiClient(null).put(API_ENDPOINTS.APPEARANCE.DESIGN_KIT, kit.value);
      const saved = ((res as { data?: DesignKit }).data ?? kit.value) as DesignKit;
      kit.value = { ...saved, background: normalizePageBackgrounds(saved.background) };
      await success(translateApp(lang, 'common.saved'));
    } catch (e) {
      await showError(translateApp(lang, 'common.error'), { text: String((e as Error).message || '') });
    } finally {
      saving.value = false;
    }
  });

  if (!kit.value) {
    return <p class="p-6 text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>;
  }

  const dark = kit.value.colors_dark ?? {};

  return (
    <div class="space-y-4">
      <PageHeader title={translateApp(lang, 'sidebar.appearanceDesignKit')} />
      <div class={`${ADMIN_FORM_CARD_CLASS} space-y-4 p-4`}>
        <p class="text-sm text-gray-600 dark:text-gray-400">{translateApp(lang, 'designKit.darkHint')}</p>
        <table class="w-full text-sm">
          <thead>
            <tr class="text-start text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th class="py-2 text-start font-medium">{translateApp(lang, 'designKit.color')}</th>
              <th class="py-2 text-start font-medium">{translateApp(lang, 'builder.style.modeLight')}</th>
              <th class="py-2 text-start font-medium">{translateApp(lang, 'builder.style.modeDark')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            {colorRows(kit.value).map((row) => {
              const darkValue = dark[row.id] || '';
              return (
                <tr key={row.id}>
                  <td class="py-3 pe-3 font-medium capitalize text-gray-800 dark:text-gray-100">
                    {row.name}
                    <span class="block font-mono text-[11px] font-normal normal-case text-gray-500">
                      --kit-color-{row.id}
                    </span>
                  </td>
                  <td class="py-3 pe-3">
                    <div class="flex items-center gap-2">
                      {row.editableLight ? (
                        <ColorPickerField
                          value={row.light}
                          alpha={false}
                          lang={lang}
                          label={`${row.name} (${translateApp(lang, 'builder.style.modeLight')})`}
                          onChange$={(next) => setLight$(row.id as KitBaseColor, next)}
                        />
                      ) : (
                        <span class="inline-block h-9 w-12 rounded border border-gray-300 dark:border-gray-600" style={{ background: row.light }} />
                      )}
                      <span class="font-mono text-xs text-gray-500">{row.light}</span>
                    </div>
                  </td>
                  <td class="py-3">
                    <div class="flex flex-wrap items-center gap-2">
                      <ColorPickerField
                        value={darkValue}
                        fallback={row.light}
                        alpha={false}
                        lang={lang}
                        label={`${row.name} (${translateApp(lang, 'builder.style.modeDark')})`}
                        onChange$={(next) => setDark$(row.id, next)}
                      />
                      {darkValue ? (
                        <>
                          <span class="font-mono text-xs text-gray-500">{darkValue}</span>
                          <button
                            type="button"
                            class="text-xs text-primary-600 hover:underline dark:text-primary-400"
                            onClick$={() => setDark$(row.id, '')}
                          >
                            {translateApp(lang, 'builder.style.sameAsLight')}
                          </button>
                        </>
                      ) : (
                        <span class="text-xs text-gray-500 dark:text-gray-400">
                          {translateApp(lang, 'builder.style.sameAsLight')}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Site-wide page background (light / dark) */}
        <div class="border-t border-gray-100 pt-4 dark:border-gray-800">
          <DesignKitBackgroundEditor
            lang={lang}
            value={kit.value.background}
            onChange$={setBackground$}
          />
        </div>
        <button type="button" class={ADMIN_PRIMARY_BUTTON_CLASS} disabled={saving.value} onClick$={onSave$}>
          {translateApp(lang, 'common.save')}
        </button>
      </div>
    </div>
  );
});

export const head: DocumentHead = { title: 'Design kit' };
