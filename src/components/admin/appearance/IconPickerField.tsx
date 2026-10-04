import { component$, useId, useSignal, $, noSerialize, type NoSerialize, type QRL } from '@builder.io/qwik';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { MediaSelector } from '~/components/common/MediaSelector';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { loadIconSet, type LoadedIconSet } from '~/lib/admin/icon-sets';
import {
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  iconValueLabel,
  normalizeIconSize,
  parseIconValue,
  type IconSetLibrary,
  type IconValue,
} from '~/lib/icons/icon-value';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError } from '~/lib/utils/toast';
import type { Media } from '~/types/media';
import { PlusGlyph, TrashGlyph } from './InspectorGlyphs';
import {
  INSPECTOR_CHECKER_STYLE,
  INSPECTOR_INPUT,
  INSPECTOR_LABEL,
  INSPECTOR_OVERLAY_BTN,
  INSPECTOR_ROW,
  INSPECTOR_STACK_LABEL,
} from './inspector-classes';

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

/** One half of the library | upload bar under the preview. */
const SPLIT_BTN =
  'bg-white px-2 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-600 dark:bg-slate-900 dark:text-gray-200 dark:hover:bg-slate-800 dark:hover:text-primary-400';

/** Library tabs in the picker dialog: general UI icons and brand logos, both self-hosted. */
const LIBRARY_TABS: ReadonlyArray<{ id: IconSetLibrary; labelKey: string }> = [
  { id: 'lucide', labelKey: 'libraryIcons' },
  { id: 'simple-icons', labelKey: 'libraryBrands' },
];

/** Elementor-style icon control: bundled sets (Lucide, Simple Icons brands) or an uploaded SVG from the media library. */
export const IconPickerField = component$<IconPickerFieldProps>((props) => {
  const sizeInputId = `icon-size-${useId()}`;
  const libraryOpen = useSignal(false);
  const uploadOpen = useSignal(false);
  const query = useSignal('');
  const status = useSignal<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const iconSet = useSignal<NoSerialize<LoadedIconSet>>();
  const current = parseIconValue(props.value);
  const currentSetIcon = current && current.library !== 'svg' ? current : null;
  const activeLibrary = useSignal<IconSetLibrary>(currentSetIcon?.library ?? 'lucide');
  const loadedLibrary = useSignal<IconSetLibrary | null>(null);
  const t = (key: string, params?: Record<string, string | number>) =>
    translateApp(props.lang, `appearance.iconPicker.${key}`, params);

  const loadLibrary$ = $(async (library: IconSetLibrary) => {
    activeLibrary.value = library;
    if (iconSet.value && loadedLibrary.value === library) return;
    status.value = 'loading';
    try {
      iconSet.value = noSerialize(await loadIconSet(library));
      loadedLibrary.value = library;
      status.value = 'ready';
    } catch (err) {
      console.error('Icon library failed to load', err);
      status.value = 'error';
      showError(translateApp(props.lang, 'appearance.iconPicker.loadError'));
    }
  });

  const openLibrary$ = $(async () => {
    libraryOpen.value = true;
    await loadLibrary$(activeLibrary.value);
  });

  const choose$ = $(async (name: string) => {
    const icon = iconSet.value?.icon(name);
    if (!icon) return;
    libraryOpen.value = false;
    const previous = parseIconValue(props.value);
    const color = previous && previous.library !== 'svg' ? previous.color : undefined;
    await props.onChange$({
      ...icon,
      ...(color ? { color } : {}),
      ...(previous?.size ? { size: previous.size } : {}),
    });
  });

  const setColor$ = $(async (next: string) => {
    const current = parseIconValue(props.value);
    if (!current || current.library === 'svg') return;
    const { color: _previous, ...rest } = current;
    await props.onChange$(next ? { ...rest, color: next } : rest);
  });

  /** Empty clears the size so the widget's own default applies again. */
  const setSize$ = $(async (raw: string) => {
    const current = parseIconValue(props.value);
    if (!current) return;
    const { size: _previous, ...rest } = current;
    const size = raw.trim() === '' ? undefined : normalizeIconSize(raw);
    await props.onChange$(size ? { ...rest, size } : rest);
  });

  const q = query.value.trim().toLowerCase();
  const matches = iconSet.value ? iconSet.value.names.filter((n) => !q || n.includes(q)) : [];
  const visible = matches.slice(0, MAX_VISIBLE);

  return (
    <div>
      <span class={INSPECTOR_STACK_LABEL}>{props.label}</span>
      {/* Preview panel: checkerboard, remove on the preview, library / upload split bar */}
      <div class="overflow-hidden rounded-md border border-gray-200 dark:border-gray-700">
        <div class="relative bg-gray-50 dark:bg-slate-950" style={INSPECTOR_CHECKER_STYLE}>
          <button
            type="button"
            class="flex h-24 w-full items-center justify-center text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500 dark:text-gray-100"
            title={current ? iconValueLabel(current) : t('none')}
            aria-label={t('choose')}
            onClick$={openLibrary$}
          >
            {current ? (
              <SvgIcon value={{ ...current, size: undefined }} size={48} />
            ) : (
              <span class="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                <PlusGlyph />
                {t('none')}
              </span>
            )}
          </button>
          {current ? (
            <button
              type="button"
              class={INSPECTOR_OVERLAY_BTN}
              title={t('remove')}
              aria-label={t('remove')}
              onClick$={() => props.onChange$('')}
            >
              <TrashGlyph />
            </button>
          ) : null}
        </div>
        <div class="grid grid-cols-2 divide-x divide-gray-200 border-t border-gray-200 rtl:divide-x-reverse dark:divide-gray-700 dark:border-gray-700">
          <button type="button" class={SPLIT_BTN} onClick$={openLibrary$}>
            {t('choose')}
          </button>
          <button type="button" class={SPLIT_BTN} onClick$={() => (uploadOpen.value = true)}>
            {t('upload')}
          </button>
        </div>
      </div>

      {/* Icon colour: library icons draw with currentColor; uploaded images keep their own colours */}
      {currentSetIcon ? (
        <div class={`${INSPECTOR_ROW} mt-2`}>
          <span class={INSPECTOR_LABEL}>{t('color')}</span>
          <div class="flex min-w-0 items-center gap-2">
            <ColorPickerField
              value={currentSetIcon.color || ''}
              onChange$={setColor$}
              lang={props.lang}
              clearable
              fallback="#0389a1"
              label={t('color')}
              class="h-8 w-10"
            />
            <span class="truncate text-[11px] text-gray-400" dir="ltr">{currentSetIcon.color || t('colorInherit')}</span>
            {currentSetIcon.color ? (
              <button
                type="button"
                class="ms-auto shrink-0 text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400"
                onClick$={() => setColor$('')}
              >
                {t('colorReset')}
              </button>
            ) : null}
          </div>
        </div>
      ) : current?.library === 'svg' ? (
        <p class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">{t('uploadColorHint')}</p>
      ) : null}

      {/* Icon size: library icons and uploads; empty keeps the widget's default size */}
      {current ? (
        <div class={`${INSPECTOR_ROW} mt-2`}>
          <label class={INSPECTOR_LABEL} for={sizeInputId}>
            {t('size')}
          </label>
          <div class="flex min-w-0 items-center gap-2">
            <div class="relative min-w-0 flex-1">
              <input
                id={sizeInputId}
                type="number"
                inputMode="numeric"
                min={ICON_SIZE_MIN}
                max={ICON_SIZE_MAX}
                step={1}
                class={`${INSPECTOR_INPUT} pe-8`}
                placeholder={t('sizeDefault')}
                value={current.size ?? ''}
                onChange$={(_, el) => setSize$(el.value)}
              />
              <span class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">px</span>
            </div>
            {current.size ? (
              <button
                type="button"
                class="shrink-0 text-[11px] font-medium text-primary-600 hover:underline dark:text-primary-400"
                onClick$={() => setSize$('')}
              >
                {t('colorReset')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

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
            {/* Library tabs: UI icons / brand logos */}
            <div class="flex gap-1 border-b border-gray-200 px-4 pt-2 dark:border-gray-700" role="tablist">
              {LIBRARY_TABS.map((tab) => {
                const active = activeLibrary.value === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    class={[
                      '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition',
                      active
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100',
                    ].join(' ')}
                    onClick$={() => loadLibrary$(tab.id)}
                  >
                    {t(tab.labelKey)}
                  </button>
                );
              })}
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
                      const selected = currentSetIcon?.library === activeLibrary.value && currentSetIcon.name === name;
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
            const size = parseIconValue(props.value)?.size;
            await props.onChange$({ library: 'svg', media_id: Number(media.id), url, ...(size ? { size } : {}) });
          })}
          onClose={$(() => {
            uploadOpen.value = false;
          })}
        />
      ) : null}
    </div>
  );
});
