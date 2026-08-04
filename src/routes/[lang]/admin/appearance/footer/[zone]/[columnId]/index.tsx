import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { appearanceZoneLabel } from '~/lib/i18n/appearance-labels';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import { AdminSwitch } from '~/components/admin/appearance/AdminSwitch';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
import { MediaSelector } from '~/components/common/MediaSelector';
import { usePublicSiteMeta } from '../../../../layout';
import {
  canInsertType,
  countByType,
  fetchAppearanceRegistriesFromBrowser,
  fetchFooterBuilderFromBrowser,
  formatAppearanceError,
  moveItem,
  newBlockId,
  saveFooterBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import type {
  AppearanceRegistryEntry,
  FooterBlockInstance,
  FooterBuilderDocument,
  FooterColumnInstance,
} from '~/lib/marketing/appearance-types';
import type { Media } from '~/types/media';

const VALID_ZONES = new Set(['top', 'main', 'bottom']);

export default component$(() => {
  const loc = useLocation();
  const zone = String(loc.params.zone ?? '').toLowerCase();
  const columnId = String(loc.params.columnId ?? '');
  const { lang } = useTranslate();
  const langConfig = usePublicSiteMeta();
  const R = getLocalizedRoutes(lang);
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const doc = useSignal<FooterBuilderDocument | null>(null);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const insertType = useSignal('links');
  const expandedId = useSignal<string | null>(null);
  const dragFromIndex = useSignal<number | null>(null);
  const dropOverIndex = useSignal<number | null>(null);
  const mediaTarget = useSignal<{ blockId: string; key: string; accept?: string } | null>(null);
  const settingsLocale = useSignal(
    (langConfig.value.content_editing_locale || langConfig.value.default_locale || 'en').toLowerCase(),
  );

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (!VALID_ZONES.has(zone) || !columnId) {
      loading.value = false;
      return;
    }
    try {
      const [regs, footer] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        fetchFooterBuilderFromBrowser(),
      ]);
      registry.value = regs.footer_blocks;
      doc.value = footer;
      if (regs.footer_blocks[0]) insertType.value = regs.footer_blocks[0].type;
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, 'Failed to load column'),
      });
    } finally {
      loading.value = false;
    }
  });

  const getColumn = (): FooterColumnInstance | null => {
    const z = doc.value?.zones?.[zone as 'top' | 'main' | 'bottom'];
    return z?.columns.find((c) => c.id === columnId) ?? null;
  };

  const updateColumn = $((updater: (col: FooterColumnInstance) => FooterColumnInstance) => {
    if (!doc.value) return;
    const zKey = zone as 'top' | 'main' | 'bottom';
    const z = doc.value.zones[zKey] ?? { enabled: true, columns: [] };
    doc.value = {
      ...doc.value,
      zones: {
        ...doc.value.zones,
        [zKey]: {
          ...z,
          columns: z.columns.map((c) => (c.id === columnId ? updater(c) : c)),
        },
      },
    };
  });

  const patchBlockSettings = $((blockId: string, next: Record<string, unknown>) => {
    updateColumn((col) => ({
      ...col,
      blocks: col.blocks.map((b) => (b.id === blockId ? { ...b, settings: next } : b)),
    }));
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

  if (!VALID_ZONES.has(zone) || !columnId) {
    return <p class="text-sm text-red-600">Unknown column.</p>;
  }

  const column = getColumn();

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`${R.ADMIN.APPEARANCE_FOOTER}/${zone}`}
            class="text-sm text-primary-600 hover:underline"
          >
            {translateApp(lang, 'appearance.backToColumns', {
              zone: appearanceZoneLabel(lang, zone),
            })}
          </Link>
          <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white text-start">Edit column</h1>
          <p class="mt-1 text-sm text-gray-500 text-start">
            {translateApp(lang, 'appearance.homepageSubtitle')}
          </p>
        </div>
        <button
          type="button"
          disabled={saving.value || loading.value || !column}
          onClick$={save}
          class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
        </button>
      </div>

      {loading.value || !doc.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : !column ? (
        <p class="text-sm text-red-600">Column not found.</p>
      ) : (
        <>
          <div class="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div>
              <label class="mb-1 block text-xs font-medium">Block type</label>
              <select
                class="rounded-lg border px-3 py-2 text-sm dark:bg-gray-900"
                value={insertType.value}
                onChange$={(e) => {
                  insertType.value = (e.target as HTMLSelectElement).value;
                }}
              >
                {registry.value.map((r) => {
                  const counts = countByType(column.blocks);
                  const disabled = !canInsertType(r.type, counts, r.max_instances);
                  let optionText = r.label;
                  if (disabled) {
                    optionText += ` ${translateApp(lang, 'appearance.fullSuffix')}`;
                  }
                  return (
                    <option key={r.type} value={r.type} disabled={disabled}>
                      {optionText}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              class="rounded-lg border px-4 py-2 text-sm"
              onClick$={() => {
                const type = insertType.value;
                const entry = registry.value.find((r) => r.type === type);
                const counts = countByType(getColumn()?.blocks ?? []);
                if (!canInsertType(type, counts, entry?.max_instances ?? null)) {
                  showError(translateApp(lang, 'common.error'), {
                    text: `Maximum instances for ${entry?.label ?? type}`,
                  });
                  return;
                }
                const block: FooterBlockInstance = {
                  id: newBlockId(type),
                  type,
                  enabled: true,
                  settings: { ...(entry?.default_settings ?? {}) },
                };
                updateColumn((col) => ({ ...col, blocks: [...col.blocks, block] }));
                expandedId.value = block.id;
              }}
            >
              Insert block
            </button>
          </div>

          <ul class="space-y-3" role="list">
            {(getColumn()?.blocks ?? []).map((block, index) => {
              const entry = registry.value.find((r) => r.type === block.type);
              const label = entry?.label ?? block.type;
              const open = expandedId.value === block.id;
              const isDropTarget = dropOverIndex.value === index && dragFromIndex.value !== index;
              return (
                <li
                  key={block.id}
                  class={[
                    'rounded-lg border bg-white dark:bg-gray-800',
                    isDropTarget
                      ? 'border-primary-500 ring-2 ring-primary-500/30'
                      : 'border-gray-200 dark:border-gray-700',
                    block.enabled === false ? 'opacity-60' : '',
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
                      updateColumn((col) => ({
                        ...col,
                        blocks: moveItem(col.blocks, from, index),
                      }));
                    }
                    dragFromIndex.value = null;
                    dropOverIndex.value = null;
                  }}
                >
                  <div class="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-4">
                    <button
                      type="button"
                      class="cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-700"
                      draggable={true}
                      title="Drag to reorder"
                      aria-label={`Drag ${label}`}
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
                      class="min-w-0 flex-1 text-start text-sm font-semibold"
                      onClick$={() => {
                        expandedId.value = open ? null : block.id;
                      }}
                    >
                      {label}
                      <span class="ms-2 text-xs font-normal text-gray-400">
                        {open
                          ? translateApp(lang, 'appearance.hideSettings')
                          : translateApp(lang, 'appearance.settings')}
                      </span>
                    </button>
                    <div class="flex flex-wrap items-center gap-3 sm:ms-auto">
                      <AdminSwitch
                        checked={block.enabled !== false}
                        label={translateApp(lang, 'appearance.enabled')}
                        onChange$={(checked) => {
                          updateColumn((col) => ({
                            ...col,
                            blocks: col.blocks.map((b, i) =>
                              i === index ? { ...b, enabled: checked } : b,
                            ),
                          }));
                        }}
                      />
                      <button
                        type="button"
                        class="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                        onClick$={() => {
                          updateColumn((col) => ({
                            ...col,
                            blocks: col.blocks.filter((_, i) => i !== index),
                          }));
                          if (expandedId.value === block.id) expandedId.value = null;
                        }}
                      >
                        {translateApp(lang, 'appearance.remove')}
                      </button>
                    </div>
                  </div>
                  {open ? (
                    <div class="border-t px-4 py-4 dark:border-gray-700">
                      {(entry?.settings_fields?.length ?? 0) > 0 ? (
                        <AppearanceSettingsFields
                          fields={entry!.settings_fields!}
                          values={block.settings ?? {}}
                          languages={langConfig.value.site_languages}
                          defaultLocale={langConfig.value.default_locale}
                          activeLocale={settingsLocale.value}
                          languagesSettingsHref={R.ADMIN.SETTINGS_LANGUAGES}
                          onLocaleChange$={$((code) => {
                            settingsLocale.value = code;
                          })}
                          onSettingsChange$={async (next) => {
                            await patchBlockSettings(block.id, next);
                          }}
                          onPickMedia$={async (key, accept) => {
                            mediaTarget.value = { blockId: block.id, key, accept };
                          }}
                        />
                      ) : (
                        <p class="text-sm text-gray-500">No configurable settings for this block.</p>
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
          title="Select media"
          accept={mediaTarget.value.accept || 'image/*'}
          onSelect={$((media: Media) => {
            const target = mediaTarget.value;
            if (!target) return;
            const url = media.url || media.thumbnailUrl || '';
            updateColumn((col) => ({
              ...col,
              blocks: col.blocks.map((b) =>
                b.id === target.blockId
                  ? { ...b, settings: { ...(b.settings ?? {}), [target.key]: url } }
                  : b,
              ),
            }));
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
  title: 'Edit footer column',
};
