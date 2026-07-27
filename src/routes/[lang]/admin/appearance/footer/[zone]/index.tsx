import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, useLocation } from '@builder.io/qwik-city';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchFooterBuilderFromBrowser,
  formatAppearanceError,
  moveItem,
  newColumnId,
  saveFooterBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import type {
  FooterBuilderDocument,
  FooterColumnInstance,
  FooterZoneInstance,
} from '~/lib/marketing/appearance-types';

const VALID_ZONES = new Set(['top', 'main', 'bottom']);

export default component$(() => {
  const loc = useLocation();
  const zone = String(loc.params.zone ?? '').toLowerCase();
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const doc = useSignal<FooterBuilderDocument | null>(null);
  const dragFromIndex = useSignal<number | null>(null);
  const dropOverIndex = useSignal<number | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    if (!VALID_ZONES.has(zone)) {
      loading.value = false;
      return;
    }
    try {
      doc.value = await fetchFooterBuilderFromBrowser();
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, 'Failed to load footer'),
      });
    } finally {
      loading.value = false;
    }
  });

  const zoneData = (): FooterZoneInstance =>
    doc.value?.zones?.[zone as 'top' | 'main' | 'bottom'] ?? { enabled: true, columns: [] };

  const setZone = $((next: FooterZoneInstance) => {
    if (!doc.value) return;
    doc.value = {
      ...doc.value,
      zones: {
        ...doc.value.zones,
        [zone]: next,
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

  if (!VALID_ZONES.has(zone)) {
    return <p class="text-sm text-red-600">Unknown footer zone.</p>;
  }

  return (
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href={R.ADMIN.APPEARANCE_FOOTER} class="text-sm text-primary-600 hover:underline">
            ← Footer builder
          </Link>
          <h1 class="mt-2 text-2xl font-bold capitalize text-gray-900 dark:text-white">
            {zone} zone columns
          </h1>
          <p class="mt-1 text-sm text-gray-500">Drag to reorder columns.</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="rounded-lg border px-3 py-2 text-sm"
            onClick$={() => {
              const z = zoneData();
              const col: FooterColumnInstance = {
                id: newColumnId(),
                span: 3,
                blocks: [],
              };
              setZone({ ...z, columns: [...z.columns, col] });
            }}
          >
            Add column
          </button>
          <button
            type="button"
            disabled={saving.value || loading.value}
            onClick$={save}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving.value ? translateApp(lang, 'common.loading') : translateApp(lang, 'common.save')}
          </button>
        </div>
      </div>

      {loading.value || !doc.value ? (
        <p class="text-sm text-gray-500">{translateApp(lang, 'common.loading')}</p>
      ) : (
        <ul class="space-y-3" role="list">
          {zoneData().columns.map((col, index) => {
            const isDropTarget = dropOverIndex.value === index && dragFromIndex.value !== index;
            return (
              <li
                key={col.id}
                class={[
                  'flex flex-wrap items-center gap-3 rounded-lg border bg-white px-3 py-3 dark:bg-gray-800 sm:px-4',
                  isDropTarget
                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                    : 'border-gray-200 dark:border-gray-700',
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
                    const z = zoneData();
                    setZone({ ...z, columns: moveItem(z.columns, from, index) });
                  }
                  dragFromIndex.value = null;
                  dropOverIndex.value = null;
                }}
              >
                <button
                  type="button"
                  class="cursor-grab touch-none rounded p-1 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-700"
                  draggable={true}
                  title="Drag to reorder"
                  aria-label={`Drag column ${index + 1}`}
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
                <span class="font-medium text-gray-900 dark:text-white">Column {index + 1}</span>
                <label class="flex items-center gap-2 text-sm">
                  Span
                  <input
                    type="number"
                    min={1}
                    max={12}
                    class="w-16 rounded border px-2 py-1 text-sm dark:bg-gray-900"
                    value={col.span}
                    onInput$={(e) => {
                      const span = Number((e.target as HTMLInputElement).value);
                      const z = zoneData();
                      setZone({
                        ...z,
                        columns: z.columns.map((c, i) => (i === index ? { ...c, span } : c)),
                      });
                    }}
                  />
                </label>
                <span class="text-sm text-gray-500">{col.blocks.length} blocks</span>
                <Link
                  href={`${R.ADMIN.APPEARANCE_FOOTER}/${zone}/${col.id}`}
                  class="ml-auto text-sm font-medium text-primary-600 hover:underline"
                >
                  Edit column
                </Link>
                <button
                  type="button"
                  class="rounded border border-red-300 px-2 py-1 text-xs text-red-600"
                  onClick$={() => {
                    const z = zoneData();
                    setZone({ ...z, columns: z.columns.filter((_, i) => i !== index) });
                  }}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

export const head: DocumentHead = {
  title: 'Footer zone columns',
};
