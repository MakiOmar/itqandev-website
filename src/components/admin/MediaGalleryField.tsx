import { component$, useSignal, $ } from '@builder.io/qwik';
import { MediaSelector } from '~/components/common/MediaSelector';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import type { Media } from '~/types/media';

export type GalleryFieldItem = { id: number; url: string; name: string };

const ICON_BUTTON =
  'rounded bg-white/90 px-1.5 py-0.5 text-xs font-medium text-gray-800 shadow hover:bg-white disabled:opacity-40 dark:bg-gray-900/90 dark:text-gray-100';

/**
 * Ordered image gallery picked from the media library. Submits the ids as JSON in a hidden input
 * named `name` (e.g. `gallery_media_ids_json`); parse it with `parseGalleryIdsJson`.
 */
export const MediaGalleryField = component$<{ name: string; initial?: GalleryFieldItem[]; max?: number }>((props) => {
  const { lang } = useTranslate();
  const items = useSignal<GalleryFieldItem[]>(props.initial ?? []);
  const picking = useSignal(false);
  const max = props.max ?? 100;

  const move = $((index: number, delta: number) => {
    const next = [...items.value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    items.value = next;
  });

  return (
    <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <input type="hidden" name={props.name} value={JSON.stringify(items.value.map((i) => i.id))} />
      <h3 class="mb-1 text-base font-semibold text-gray-900 dark:text-gray-100">
        {translateApp(lang, 'projects.gallery.title')}
      </h3>
      <p class="mb-3 text-xs text-gray-600 dark:text-gray-400">{translateApp(lang, 'projects.gallery.help')}</p>

      {items.value.length === 0 ? (
        // <!-- Empty state -->
        <p class="mb-3 rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {translateApp(lang, 'projects.gallery.empty')}
        </p>
      ) : (
        <ul class="mb-3 grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-3">
          {items.value.map((item, index) => (
            <li
              key={item.id}
              class="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
            >
              <img src={item.url} alt={item.name} class="h-28 w-full object-cover" loading="lazy" />
              <div class="absolute inset-x-1 top-1 flex justify-between gap-1">
                <span class="flex gap-1">
                  <button
                    type="button"
                    class={ICON_BUTTON}
                    disabled={index === 0}
                    aria-label={translateApp(lang, 'projects.gallery.moveEarlier')}
                    title={translateApp(lang, 'projects.gallery.moveEarlier')}
                    onClick$={() => move(index, -1)}
                  >
                    <span class="rtl:hidden">←</span>
                    <span class="hidden rtl:inline">→</span>
                  </button>
                  <button
                    type="button"
                    class={ICON_BUTTON}
                    disabled={index === items.value.length - 1}
                    aria-label={translateApp(lang, 'projects.gallery.moveLater')}
                    title={translateApp(lang, 'projects.gallery.moveLater')}
                    onClick$={() => move(index, 1)}
                  >
                    <span class="rtl:hidden">→</span>
                    <span class="hidden rtl:inline">←</span>
                  </button>
                </span>
                <button
                  type="button"
                  class={`${ICON_BUTTON} text-red-700 dark:text-red-300`}
                  aria-label={translateApp(lang, 'projects.gallery.remove')}
                  title={translateApp(lang, 'projects.gallery.remove')}
                  onClick$={() => {
                    items.value = items.value.filter((i) => i.id !== item.id);
                  }}
                >
                  ✕
                </button>
              </div>
              <p class="truncate px-2 py-1 text-xs text-gray-600 dark:text-gray-300">{item.name}</p>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        disabled={items.value.length >= max}
        onClick$={() => {
          picking.value = true;
        }}
        class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60"
      >
        {translateApp(lang, 'projects.gallery.add')}
      </button>

      {picking.value && (
        <MediaSelector
          title={translateApp(lang, 'projects.gallery.add')}
          accept="image/*"
          callback="gallery"
          onSelect={$((media: Media) => {
            if (!items.value.some((i) => i.id === media.id)) {
              items.value = [
                ...items.value,
                { id: media.id, url: media.thumbnailUrl || media.url || '', name: media.name || media.fileName || '' },
              ];
            }
            picking.value = false;
          })}
          onClose={$(() => {
            picking.value = false;
          })}
        />
      )}
    </div>
  );
});
