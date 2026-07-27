import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  canInsertType,
  countByType,
  fetchAppearanceRegistriesFromBrowser,
  fetchHomepageBuilderFromBrowser,
  formatAppearanceError,
  moveItem,
  newSectionId,
  saveHomepageBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import type {
  AppearanceRegistryEntry,
  HomepageSectionInstance,
} from '~/lib/marketing/appearance-types';

function settingStr(section: HomepageSectionInstance, key: string): string {
  const v = section.settings?.[key];
  return typeof v === 'string' ? v : '';
}

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const sections = useSignal<HomepageSectionInstance[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const insertType = useSignal('hero');
  const expandedId = useSignal<string | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [regs, home] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        fetchHomepageBuilderFromBrowser(),
      ]);
      registry.value = regs.homepage_sections;
      sections.value = home.sections;
      if (regs.homepage_sections[0]) {
        insertType.value = regs.homepage_sections[0].type;
      }
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, 'Failed to load homepage builder'),
      });
    } finally {
      loading.value = false;
    }
  });

  const insertSection = $(() => {
    const type = insertType.value;
    const entry = registry.value.find((r) => r.type === type);
    const counts = countByType(sections.value);
    if (!canInsertType(type, counts, entry?.max_instances ?? null)) {
      showError(translateApp(lang, 'common.error'), {
        text: `Maximum instances reached for ${entry?.label ?? type}`,
      });
      return;
    }
    const next: HomepageSectionInstance = {
      id: newSectionId(type),
      type,
      enabled: true,
      layout_width: type === 'hero' ? 'full' : 'boxed',
      settings: {},
    };
    sections.value = [...sections.value, next];
    expandedId.value = next.id;
  });

  const save = $(async () => {
    saving.value = true;
    const result = await saveHomepageBuilderFromBrowser(sections.value);
    saving.value = false;
    if (result.success) {
      if (result.data?.sections) {
        sections.value = result.data.sections;
      }
      showSuccess(translateApp(lang, 'common.success'), {
        text: result.message || 'Homepage layout saved.',
      });
    } else {
      showError(translateApp(lang, 'common.error'), {
        text: result.error || 'Save failed',
      });
    }
  });

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Homepage builder</h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Insert, reorder, and configure public homepage sections.
          </p>
        </div>
        <button
          type="button"
          disabled={saving.value || loading.value}
          onClick$={save}
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
        </button>
      </div>

      {loading.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : (
        <>
          <div class="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div>
              <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                Section type
              </label>
              <select
                class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                value={insertType.value}
                onChange$={(e) => {
                  insertType.value = (e.target as HTMLSelectElement).value;
                }}
              >
                {registry.value.map((r) => {
                  const counts = countByType(sections.value);
                  const disabled = !canInsertType(r.type, counts, r.max_instances);
                  return (
                    <option key={r.type} value={r.type} disabled={disabled}>
                      {r.label}
                      {r.max_instances != null ? ` (max ${r.max_instances})` : ''}
                      {disabled ? ' — full' : ''}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              onClick$={insertSection}
              class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Insert section
            </button>
          </div>

          <ul class="space-y-3" role="list">
            {sections.value.map((section, index) => {
              const label =
                registry.value.find((r) => r.type === section.type)?.label ?? section.type;
              const open = expandedId.value === section.id;
              return (
                <li
                  key={section.id}
                  class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <div class="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      class="text-sm font-semibold text-gray-900 dark:text-white"
                      onClick$={() => {
                        expandedId.value = open ? null : section.id;
                      }}
                    >
                      {label}
                    </button>
                    <label class="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={section.enabled !== false}
                        onChange$={(e) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          sections.value = sections.value.map((s, i) =>
                            i === index ? { ...s, enabled: checked } : s,
                          );
                        }}
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === 0}
                      onClick$={() => {
                        sections.value = moveItem(sections.value, index, index - 1);
                      }}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === sections.value.length - 1}
                      onClick$={() => {
                        sections.value = moveItem(sections.value, index, index + 1);
                      }}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      class="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      onClick$={() => {
                        sections.value = sections.value.filter((_, i) => i !== index);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  {open ? (
                    <div class="space-y-3 border-t border-gray-100 px-4 py-4 dark:border-gray-700">
                      <div>
                        <label class="mb-1 block text-xs font-medium">Layout width</label>
                        <select
                          class="rounded border px-2 py-1 text-sm dark:bg-gray-900"
                          value={section.layout_width || 'boxed'}
                          onChange$={(e) => {
                            const v = (e.target as HTMLSelectElement).value as 'boxed' | 'full';
                            sections.value = sections.value.map((s, i) =>
                              i === index ? { ...s, layout_width: v } : s,
                            );
                          }}
                        >
                          <option value="boxed">Boxed</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                      {['hero', 'services_teaser', 'case_studies', 'testimonials', 'blog_preview', 'cta', 'tech_stack'].includes(
                        section.type,
                      ) ? (
                        <div class="grid gap-3 md:grid-cols-2">
                          {[
                            'headline',
                            'subheadline',
                            'primary_cta_label',
                            'secondary_cta_label',
                            'eyebrow',
                            'title',
                            'subtitle',
                            'button_label',
                          ].map((key) => (
                            <div key={key}>
                              <label class="mb-1 block text-xs font-medium capitalize">
                                {key.replaceAll('_', ' ')}
                              </label>
                              <input
                                type="text"
                                class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
                                value={settingStr(section, key)}
                                onInput$={(e) => {
                                  const value = (e.target as HTMLInputElement).value;
                                  sections.value = sections.value.map((s, i) =>
                                    i === index
                                      ? {
                                          ...s,
                                          settings: { ...(s.settings ?? {}), [key]: value },
                                        }
                                      : s,
                                  );
                                }}
                              />
                            </div>
                          ))}
                          {['services_teaser', 'case_studies', 'testimonials', 'blog_preview'].includes(
                            section.type,
                          ) ? (
                            <div>
                              <label class="mb-1 block text-xs font-medium">Limit</label>
                              <input
                                type="number"
                                min={1}
                                max={24}
                                class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
                                value={Number(section.settings?.limit ?? 3)}
                                onInput$={(e) => {
                                  const value = Number((e.target as HTMLInputElement).value);
                                  sections.value = sections.value.map((s, i) =>
                                    i === index
                                      ? {
                                          ...s,
                                          settings: { ...(s.settings ?? {}), limit: value },
                                        }
                                      : s,
                                  );
                                }}
                              />
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Homepage builder',
};
