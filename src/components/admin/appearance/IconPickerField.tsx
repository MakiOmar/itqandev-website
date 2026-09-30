import { component$, useSignal, $, noSerialize, type NoSerialize, type QRL } from '@builder.io/qwik';
import { MediaSelector } from '~/components/common/MediaSelector';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { loadIconSet, type LoadedIconSet } from '~/lib/admin/icon-sets';
import { iconValueLabel, parseIconValue, type IconValue } from '~/lib/icons/icon-value';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError } from '~/lib/utils/toast';
import type { Media } from '~/types/media';

export type IconPickerFieldProps = {
  label: string;
  value: unknown;
  lang: string;
  onChange$: QRL<(next: IconValue | '') => void>;
};

/** Grid renders at most this many matches; searching narrows the rest. */
const MAX_VISIBLE = 240;

const BTN =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-slate-800';

/** Elementor-style icon control: bundled Lucide set (self-hosted) or an uploaded SVG from the media library. */
export const IconPickerField = component$<IconPickerFieldProps>((props) => {
  const libraryOpen = useSignal(false);
  const uploadOpen = useSignal(false);
  const query = useSignal('');
  const status = useSignal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const iconSet = useSignal<NoSerialize<LoadedIconSet>>();
  const current = parseIconValue(props.value);
  const t = (key: string, params?: Record<string, string | number>) =>
    translateApp(props.lang, `appearance.iconPicker.${key}`, params);

  const openLibrary$ = $(async () => {
    libraryOpen.value = true;
    if (iconSet.value) return;
    status.value = 'loading';
    try {
      iconSet.value = noSerialize(await loadIconSet('lucide'));
      status.value = 'ready';
    } catch (err) {
      console.error('Icon library failed to load', err);
      status.value = 'error';
      showError(translateApp(props.lang, 'appearance.iconPicker.loadError'));
    }
  });

  const choose$ = $(async (name: string) => {
    const icon = iconSet.value?.icon(name);
    if (!icon) return;
    libraryOpen.value = false;
    await props.onChange$(icon);
  });

  const q = query.value.trim().toLowerCase();
  const matches = iconSet.value ? iconSet.value.names.filter((n) => !q || n.includes(q)) : [];
  const visible = matches.slice(0, MAX_VISIBLE);

  return (
    <div class="md:col-span-2">
      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">{props.label}</label>
      {/* Current icon preview + actions */}
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-slate-800 dark:text-gray-100">
          {current ? <SvgIcon value={current} size={22} /> : <span class="text-xs text-gray-400">—</span>}
        </span>
        <span class="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
          {current ? iconValueLabel(current) : t('none')}
        </span>
        <button type="button" class={BTN} onClick$={openLibrary$}>
          {t('choose')}
        </button>
        <button type="button" class={BTN} onClick$={() => (uploadOpen.value = true)}>
          {t('upload')}
        </button>
        {current ? (
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            onClick$={() => props.onChange$('')}
          >
            {t('remove')}
          </button>
        ) : null}
      </div>

      {/* Icon library dialog */}
      {libraryOpen.value ? (
        <div
          class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('title')}
          window:onKeyDown$={(e) => {
            if ((e as KeyboardEvent).key === 'Escape') libraryOpen.value = false;
          }}
          onClick$={(e, el) => {
            if (e.target === el) libraryOpen.value = false;
          }}
        >
          <div class="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900">
            <div class="flex items-center gap-3 border-b border-gray-200 p-4 dark:border-gray-700">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">{t('title')}</h2>
              <input
                type="search"
                class="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-800"
                placeholder={t('search')}
                value={query.value}
                autoFocus
                onInput$={(_, el) => (query.value = el.value)}
              />
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-lg leading-none text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
                aria-label={t('close')}
                onClick$={() => (libraryOpen.value = false)}
              >
                ×
              </button>
            </div>
            <div class="min-h-[12rem] overflow-y-auto p-4">
              {status.value === 'loading' ? (
                <p class="py-10 text-center text-sm text-gray-500">{t('loading')}</p>
              ) : status.value === 'error' ? (
                <div class="py-10 text-center text-sm text-red-600">
                  <p>{t('loadError')}</p>
                  <button type="button" class={`${BTN} mt-3`} onClick$={openLibrary$}>
                    {t('retry')}
                  </button>
                </div>
              ) : visible.length === 0 ? (
                <p class="py-10 text-center text-sm text-gray-500">{t('empty')}</p>
              ) : (
                <>
                  <ul class="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10" role="list">
                    {visible.map((name) => {
                      const icon = iconSet.value?.icon(name);
                      const selected = current?.library === 'lucide' && current.name === name;
                      return (
                        <li key={name}>
                          <button
                            type="button"
                            title={name}
                            aria-label={name}
                            aria-pressed={selected}
                            class={[
                              'flex aspect-square w-full items-center justify-center rounded-lg border text-gray-700 transition hover:border-primary-500 hover:text-primary-600 dark:text-gray-200',
                              selected
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/40'
                                : 'border-gray-200 dark:border-gray-700',
                            ].join(' ')}
                            onClick$={() => choose$(name)}
                          >
                            {icon ? <SvgIcon value={icon} size={22} /> : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {matches.length > visible.length ? (
                    <p class="mt-3 text-center text-xs text-gray-500">
                      {t('showingFirst', { count: visible.length, total: matches.length })}
                    </p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Upload icon: media library restricted to images (SVG, WebP, PNG, …) */}
      {uploadOpen.value ? (
        <MediaSelector
          title={t('upload')}
          accept="image/*"
          onSelect={$(async (media: Media) => {
            uploadOpen.value = false;
            const url = media.url || '';
            if (!media.id || !url) return;
            await props.onChange$({ library: 'svg', media_id: Number(media.id), url });
          })}
          onClose={$(() => {
            uploadOpen.value = false;
          })}
        />
      ) : null}
    </div>
  );
});
