import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { MediaSelector } from '~/components/common/MediaSelector';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
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
import type { Media } from '~/types/media';

export default component$(() => {
  const { lang } = useTranslate();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const sections = useSignal<HomepageSectionInstance[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const insertType = useSignal('hero');
  const expandedId = useSignal<string | null>(null);
  const dragFromIndex = useSignal<number | null>(null);
  const dropOverIndex = useSignal<number | null>(null);
  const mediaTarget = useSignal<{ sectionId: string; key: string; accept?: string } | null>(null);

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

  const patchSection = $((sectionId: string, patch: Partial<HomepageSectionInstance>) => {
    sections.value = sections.value.map((s) => (s.id === sectionId ? { ...s, ...patch } : s));
  });

  const patchSetting = $((sectionId: string, key: string, value: unknown) => {
    sections.value = sections.value.map((s) =>
      s.id === sectionId ? { ...s, settings: { ...(s.settings ?? {}), [key]: value } } : s,
    );
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
      settings: { ...(entry?.default_settings ?? {}) },
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
            Drag to reorder. Expand a section to edit its settings.
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
              const entry = registry.value.find((r) => r.type === section.type);
              const label = entry?.label ?? section.type;
              const open = expandedId.value === section.id;
              const isDropTarget = dropOverIndex.value === index && dragFromIndex.value !== index;
              return (
                <li
                  key={section.id}
                  class={[
                    'rounded-lg border bg-white dark:bg-gray-800',
                    isDropTarget
                      ? 'border-primary-500 ring-2 ring-primary-500/30'
                      : 'border-gray-200 dark:border-gray-700',
                    section.enabled === false ? 'opacity-60' : '',
                  ].join(' ')}
                  onDragOver$={(e) => {
                    e.preventDefault();
                    dropOverIndex.value = index;
                  }}
                  onDragLeave$={() => {
                    if (dropOverIndex.value === index) dropOverIndex.value = null;
                  }}
                  onDrop$={(e) => {
                    e.preventDefault();
                    const from = dragFromIndex.value;
                    if (from != null && from !== index) {
                      sections.value = moveItem(sections.value, from, index);
                    }
                    dragFromIndex.value = null;
                    dropOverIndex.value = null;
                  }}
                >
                  <div class="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
                    <button
                      type="button"
                      class="cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 active:cursor-grabbing dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      draggable={true}
                      title="Drag to reorder"
                      aria-label={`Drag to reorder ${label}`}
                      onDragStart$={(e) => {
                        dragFromIndex.value = index;
                        const dt = e.dataTransfer;
                        if (dt) {
                          dt.effectAllowed = 'move';
                          dt.setData('text/plain', String(index));
                        }
                      }}
                      onDragEnd$={() => {
                        dragFromIndex.value = null;
                        dropOverIndex.value = null;
                      }}
                    >
                      <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path d="M7 4a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm9-12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm0 6a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="text-left text-sm font-semibold text-gray-900 dark:text-white"
                      onClick$={() => {
                        expandedId.value = open ? null : section.id;
                      }}
                    >
                      {label}
                      <span class="ml-2 text-xs font-normal text-gray-400">
                        {open ? 'Hide settings' : 'Settings'}
                      </span>
                    </button>
                    <div class="ml-auto flex flex-wrap items-center gap-3">
                      <AdminSwitch
                        checked={section.enabled !== false}
                        label="Enabled"
                        onChange$={async (checked) => {
                          await patchSection(section.id, { enabled: checked });
                        }}
                      />
                      <button
                        type="button"
                        class="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                        onClick$={() => {
                          sections.value = sections.value.filter((s) => s.id !== section.id);
                          if (expandedId.value === section.id) expandedId.value = null;
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div class="space-y-4 border-t border-gray-100 px-4 py-4 dark:border-gray-700">
                      <div>
                        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                          Layout width
                        </label>
                        <select
                          class="rounded border px-2 py-1 text-sm dark:bg-gray-900"
                          value={section.layout_width || 'boxed'}
                          onChange$={async (e) => {
                            const v = (e.target as HTMLSelectElement).value as 'boxed' | 'full';
                            await patchSection(section.id, { layout_width: v });
                          }}
                        >
                          <option value="boxed">Boxed</option>
                          <option value="full">Full</option>
                        </select>
                      </div>
                      {(entry?.settings_fields?.length ?? 0) > 0 ? (
                        <AppearanceSettingsFields
                          fields={entry!.settings_fields!}
                          values={section.settings ?? {}}
                          onFieldChange$={async (key, value) => {
                            await patchSetting(section.id, key, value);
                          }}
                          onPickMedia$={async (key, accept) => {
                            mediaTarget.value = { sectionId: section.id, key, accept };
                          }}
                        />
                      ) : (
                        <p class="text-sm text-gray-500">No configurable settings for this section.</p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mediaTarget.value ? (
        <MediaSelector
          title="Select image"
          accept={mediaTarget.value.accept || 'image/*'}
          onSelect={$((media: Media) => {
            const target = mediaTarget.value;
            if (!target) return;
            const url = media.url || media.thumbnailUrl || '';
            sections.value = sections.value.map((s) =>
              s.id === target.sectionId
                ? { ...s, settings: { ...(s.settings ?? {}), [target.key]: url } }
                : s,
            );
            mediaTarget.value = null;
          })}
          onClose={$(() => {
            mediaTarget.value = null;
          })}
        />
      ) : null}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Homepage builder',
};
