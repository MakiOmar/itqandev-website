import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
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

const VALID_ZONES = new Set(['top', 'main', 'bottom']);

function blockSetting(block: FooterBlockInstance, key: string): string {
  const v = block.settings?.[key];
  return typeof v === 'string' ? v : '';
}

export default component$(() => {
  const loc = useLocation();
  const zone = String(loc.params.zone ?? '').toLowerCase();
  const columnId = String(loc.params.columnId ?? '');
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const doc = useSignal<FooterBuilderDocument | null>(null);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const insertType = useSignal('links');
  const expandedId = useSignal<string | null>(null);

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

  const column = getColumn();

  if (!VALID_ZONES.has(zone)) {
    return <p class="text-sm text-red-600">Unknown footer zone.</p>;
  }

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`${R.ADMIN.APPEARANCE_FOOTER}/${zone}`}
            class="text-sm text-primary-600 hover:underline"
          >
            ← {zone} columns
          </Link>
          <h1 class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">Edit column</h1>
          <p class="text-sm text-gray-500">{columnId}</p>
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

      {loading.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : !column ? (
        <p class="text-sm text-red-600">Column not found. Save zone columns first.</p>
      ) : (
        <>
          <div class="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div>
              <label class="mb-1 block text-xs font-medium">Block type</label>
              <select
                class="rounded border px-3 py-2 text-sm dark:bg-gray-900"
                value={insertType.value}
                onChange$={(e) => {
                  insertType.value = (e.target as HTMLSelectElement).value;
                }}
              >
                {registry.value.map((r) => {
                  const counts = countByType(column.blocks);
                  const disabled = !canInsertType(r.type, counts, r.max_instances);
                  return (
                    <option key={r.type} value={r.type} disabled={disabled}>
                      {r.label}
                      {disabled ? ' — full' : ''}
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
                  settings: {},
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
              const label =
                registry.value.find((r) => r.type === block.type)?.label ?? block.type;
              const open = expandedId.value === block.id;
              return (
                <li
                  key={block.id}
                  class="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <div class="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      class="text-sm font-semibold"
                      onClick$={() => {
                        expandedId.value = open ? null : block.id;
                      }}
                    >
                      {label}
                    </button>
                    <label class="ml-auto flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={block.enabled !== false}
                        onChange$={(e) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          updateColumn((col) => ({
                            ...col,
                            blocks: col.blocks.map((b, i) =>
                              i === index ? { ...b, enabled: checked } : b,
                            ),
                          }));
                        }}
                      />
                      Enabled
                    </label>
                    <button
                      type="button"
                      class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === 0}
                      onClick$={() => {
                        updateColumn((col) => ({
                          ...col,
                          blocks: moveItem(col.blocks, index, index - 1),
                        }));
                      }}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      class="rounded border px-2 py-1 text-xs disabled:opacity-40"
                      disabled={index === (getColumn()?.blocks.length ?? 0) - 1}
                      onClick$={() => {
                        updateColumn((col) => ({
                          ...col,
                          blocks: moveItem(col.blocks, index, index + 1),
                        }));
                      }}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      class="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                      onClick$={() => {
                        updateColumn((col) => ({
                          ...col,
                          blocks: col.blocks.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  {open ? (
                    <div class="space-y-3 border-t px-4 py-4 dark:border-gray-700">
                      {['title', 'tagline', 'body', 'button_label', 'button_url', 'menu_slug'].map(
                        (key) => (
                          <div key={key}>
                            <label class="mb-1 block text-xs font-medium capitalize">
                              {key.replaceAll('_', ' ')}
                            </label>
                            {key === 'body' ? (
                              <textarea
                                class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
                                rows={3}
                                value={blockSetting(block, key)}
                                onInput$={(e) => {
                                  const value = (e.target as HTMLTextAreaElement).value;
                                  updateColumn((col) => ({
                                    ...col,
                                    blocks: col.blocks.map((b, i) =>
                                      i === index
                                        ? { ...b, settings: { ...(b.settings ?? {}), [key]: value } }
                                        : b,
                                    ),
                                  }));
                                }}
                              />
                            ) : (
                              <input
                                type="text"
                                class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
                                value={blockSetting(block, key)}
                                onInput$={(e) => {
                                  const value = (e.target as HTMLInputElement).value;
                                  updateColumn((col) => ({
                                    ...col,
                                    blocks: col.blocks.map((b, i) =>
                                      i === index
                                        ? { ...b, settings: { ...(b.settings ?? {}), [key]: value } }
                                        : b,
                                    ),
                                  }));
                                }}
                              />
                            )}
                          </div>
                        ),
                      )}
                      {block.type === 'links' ? (
                        <div>
                          <label class="mb-1 block text-xs font-medium">
                            Links (JSON array of {'{'}id,label,url{'}'})
                          </label>
                          <textarea
                            class="w-full rounded border px-2 py-1 font-mono text-xs dark:bg-gray-900"
                            rows={6}
                            value={JSON.stringify(block.settings?.links ?? [], null, 2)}
                            onInput$={(e) => {
                              const raw = (e.target as HTMLTextAreaElement).value;
                              try {
                                const parsed = JSON.parse(raw);
                                if (!Array.isArray(parsed)) return;
                                updateColumn((col) => ({
                                  ...col,
                                  blocks: col.blocks.map((b, i) =>
                                    i === index
                                      ? { ...b, settings: { ...(b.settings ?? {}), links: parsed } }
                                      : b,
                                  ),
                                }));
                              } catch {
                                /* ignore invalid JSON while typing */
                              }
                            }}
                          />
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
  title: 'Edit footer column',
};
