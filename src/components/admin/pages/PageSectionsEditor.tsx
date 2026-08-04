import { component$, type QRL } from '@builder.io/qwik';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import {
  canInsertType,
  countByType,
  moveItem,
  newSectionId,
} from '~/lib/admin/appearance-actions';
import { appearanceSectionLabel } from '~/lib/i18n/appearance-labels';
import { translateApp } from '~/lib/i18n/useTranslate';
import type {
  AppearanceRegistryEntry,
  HomepageSectionInstance,
} from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';

export type PageSectionsEditorProps = {
  lang: string;
  sections: HomepageSectionInstance[];
  registry: AppearanceRegistryEntry[];
  onChange$: QRL<(next: HomepageSectionInstance[]) => void>;
  onPickMedia$: QRL<(sectionId: string, key: string, accept?: string) => void>;
  languages?: SiteLanguageRow[];
  defaultLocale?: string;
  activeLocale?: string;
  onLocaleChange$?: QRL<(code: string) => void>;
  mediaPreviewById?: Record<string, string>;
  onMediaPreview$?: QRL<(mediaId: number, url: string) => void>;
};

export const PageSectionsEditor = component$<PageSectionsEditorProps>((props) => {
  const counts = countByType(props.sections);
  const insertable = props.registry.filter((entry) =>
    canInsertType(entry.type, counts, entry.max_instances),
  );

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100 text-start">
          {translateApp(props.lang, 'pages.sections')}
        </h3>
        {insertable.length > 0 ? (
          <select
            class="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs dark:border-gray-600 dark:bg-gray-900"
            value=""
            onChange$={async (e) => {
              const type = (e.target as HTMLSelectElement).value;
              (e.target as HTMLSelectElement).value = '';
              if (!type) return;
              const entry = props.registry.find((r) => r.type === type);
              if (!entry) return;
              await props.onChange$([
                ...props.sections,
                {
                  id: newSectionId(type),
                  type,
                  enabled: true,
                  layout_width: type === 'hero' ? 'full' : 'boxed',
                  settings: { ...(entry.default_settings ?? {}) },
                },
              ]);
            }}
          >
            <option value="">{translateApp(props.lang, 'pages.addSection')}</option>
            {insertable.map((entry) => (
              <option key={entry.type} value={entry.type}>
                {appearanceSectionLabel(props.lang, entry.type, entry.label)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {props.sections.length === 0 ? (
        <p class="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-600">
          {translateApp(props.lang, 'pages.sectionsEmpty')}
        </p>
      ) : (
        <ul class="space-y-3">
          {props.sections.map((section, index) => {
            const entry = props.registry.find((r) => r.type === section.type);
            return (
              <li
                key={section.id}
                class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div class="mb-3 flex flex-wrap items-center gap-2">
                  <span class="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {appearanceSectionLabel(props.lang, section.type, entry?.label || section.type)}
                  </span>
                  <AdminSwitch
                    checked={section.enabled !== false}
                    label={translateApp(props.lang, 'appearance.enabled')}
                    onChange$={async (enabled) => {
                      const next = props.sections.map((s, i) =>
                        i === index ? { ...s, enabled } : s,
                      );
                      await props.onChange$(next);
                    }}
                  />
                  <button
                    type="button"
                    class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={index === 0}
                    onClick$={async () => {
                      await props.onChange$(moveItem(props.sections, index, index - 1));
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={index >= props.sections.length - 1}
                    onClick$={async () => {
                      await props.onChange$(moveItem(props.sections, index, index + 1));
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="ms-auto rounded border border-red-300 px-2 py-1 text-xs text-red-600 dark:border-red-800"
                    onClick$={async () => {
                      await props.onChange$(props.sections.filter((_, i) => i !== index));
                    }}
                  >
                    {translateApp(props.lang, 'appearance.remove')}
                  </button>
                </div>
                {(entry?.settings_fields?.length ?? 0) > 0 ? (
                  <AppearanceSettingsFields
                    fields={entry!.settings_fields!}
                    values={section.settings ?? {}}
                    onSettingsChange$={async (next) => {
                      const updated = props.sections.map((s, i) =>
                        i === index ? { ...s, settings: next } : s,
                      );
                      await props.onChange$(updated);
                    }}
                    onPickMedia$={async (key, accept) => {
                      await props.onPickMedia$(section.id, key, accept);
                    }}
                    languages={props.languages}
                    defaultLocale={props.defaultLocale}
                    activeLocale={props.activeLocale}
                    onLocaleChange$={props.onLocaleChange$}
                    mediaPreviewById={props.mediaPreviewById}
                    onMediaPreview$={props.onMediaPreview$}
                  />
                ) : (
                  <p class="text-xs text-gray-400">{translateApp(props.lang, 'appearance.noSectionSettings')}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
