import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import { AdminSelect } from '../AdminSelect';
import { AdminSwitch } from './AdminSwitch';
import { MediaSelector } from '~/components/common/MediaSelector';
import { translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  appearanceMediaPreviewSrc,
} from '~/lib/admin/appearance-media-ref';
import {
  HERO_FLOATING_ICON_MOTIONS,
  HERO_FLOATING_ICONS_MAX,
  HERO_FLOATING_POSITION_MAX,
  HERO_FLOATING_POSITION_MIN,
  defaultHeroFloatingIcon,
  normalizeHeroFloatingIcons,
} from '~/lib/admin/hero-floating-icons';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import type { HeroFloatingIcon, HeroFloatingIconMotion } from '~/lib/marketing/appearance-types';
import type { Media } from '~/types/media';

export type HeroFloatingIconsEditorProps = {
  lang: string;
  icons: unknown;
  mediaPreviewById?: Record<string, string>;
  onChange$: QRL<(icons: HeroFloatingIcon[]) => void>;
  onPreviewUrl$?: QRL<(mediaId: number, url: string) => void>;
};

type NumericIconKey = 'x' | 'y' | 'size';

export const HeroFloatingIconsEditor = component$<HeroFloatingIconsEditorProps>((props) => {
  const pickIndex = useSignal<number | null>(null);
  const icons = normalizeHeroFloatingIcons(props.icons);
  const { confirm } = useSwal({
    confirmTitle: translateApp(props.lang, 'appearance.floatingIconRemove'),
    yes: translateApp(props.lang, 'appearance.remove'),
    no: translateApp(props.lang, 'common.cancel'),
  });

  const motionOptions = HERO_FLOATING_ICON_MOTIONS.map((m) => ({
    value: m,
    label: translateApp(props.lang, `appearance.floatingMotion_${m}`),
  }));

  const emit = $(async (next: HeroFloatingIcon[]) => {
    await props.onChange$(normalizeHeroFloatingIcons(next));
  });

  const patchIcon = $(async (index: number, patch: Partial<HeroFloatingIcon>) => {
    const current = normalizeHeroFloatingIcons(props.icons);
    await emit(current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  });

  const numberFields: Array<{ key: NumericIconKey; label: string; min: number; max: number; fallback: number }> = [
    { key: 'x', label: translateApp(props.lang, 'appearance.floatingPosX'), min: HERO_FLOATING_POSITION_MIN, max: HERO_FLOATING_POSITION_MAX, fallback: 0 },
    { key: 'y', label: translateApp(props.lang, 'appearance.floatingPosY'), min: HERO_FLOATING_POSITION_MIN, max: HERO_FLOATING_POSITION_MAX, fallback: 0 },
    { key: 'size', label: translateApp(props.lang, 'appearance.floatingSize'), min: 32, max: 120, fallback: 56 },
  ];

  return (
    <div class="md:col-span-2 space-y-3">
      <p class="text-xs text-gray-500 dark:text-gray-400 text-start">
        {translateApp(props.lang, 'appearance.floatingIconsHint')}
      </p>

      {icons.length === 0 ? (
        <p class="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-600">
          {translateApp(props.lang, 'appearance.floatingIconsEmpty')}
        </p>
      ) : (
        <ul class="space-y-2">
          {icons.map((icon, index) => {
            const preview = appearanceMediaPreviewSrc(icon.media_id, props.mediaPreviewById);
            const previewSrc = preview ? resolveLaravelMediaUrl(preview) || preview : '';
            const enabled = icon.enabled !== false;
            return (
              <li
                key={icon.id}
                class={[
                  'space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40',
                  enabled ? '' : 'opacity-60',
                ].join(' ')}
              >
                {/* Header: image (click to change), title, visibility and remove. */}
                <div class="flex items-center gap-3">
                  <button
                    type="button"
                    class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-white hover:border-primary-500 dark:border-gray-600 dark:bg-gray-950"
                    aria-label={translateApp(props.lang, 'appearance.floatingIconChange')}
                    onClick$={() => {
                      pickIndex.value = index;
                    }}
                  >
                    {previewSrc ? (
                      <img src={previewSrc} alt="" class="h-full w-full object-contain p-1" />
                    ) : (
                      <span class="text-[10px] text-gray-400">
                        {icon.media_id ? `#${icon.media_id}` : '+'}
                      </span>
                    )}
                  </button>
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                      {translateApp(props.lang, 'appearance.floatingIconLabel', { n: index + 1 })}
                    </p>
                    <div class="flex flex-wrap gap-x-3 text-xs">
                      <button
                        type="button"
                        class="text-primary-600 hover:underline dark:text-primary-400"
                        onClick$={() => {
                          pickIndex.value = index;
                        }}
                      >
                        {translateApp(props.lang, icon.media_id ? 'appearance.floatingIconChange' : 'appearance.selectFromLibrary')}
                      </button>
                      {icon.media_id ? (
                        <button
                          type="button"
                          class="text-gray-500 hover:underline dark:text-gray-400"
                          onClick$={async () => {
                            await patchIcon(index, { media_id: null });
                          }}
                        >
                          {translateApp(props.lang, 'appearance.clear')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <AdminSwitch
                    checked={enabled}
                    ariaLabel={translateApp(props.lang, 'appearance.floatingIconEnabled')}
                    onChange$={async (next) => {
                      await patchIcon(index, { enabled: next });
                    }}
                  />
                  <button
                    type="button"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                    aria-label={translateApp(props.lang, 'appearance.floatingIconRemove')}
                    title={translateApp(props.lang, 'appearance.floatingIconRemove')}
                    onClick$={async () => {
                      const result = await confirm(
                        translateApp(props.lang, 'appearance.floatingIconRemoveConfirm'),
                        { icon: 'warning' },
                      );
                      if (!result.isConfirmed) return;
                      await emit(normalizeHeroFloatingIcons(props.icons).filter((_, i) => i !== index));
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="h-4 w-4">
                      <path
                        fill-rule="evenodd"
                        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.44c-.8.08-1.58.18-2.36.3a.75.75 0 1 0 .24 1.49l.15-.03.84 10.52A2.75 2.75 0 0 0 7.61 19h4.78a2.75 2.75 0 0 0 2.74-2.53l.84-10.52.15.03a.75.75 0 0 0 .24-1.49c-.78-.12-1.56-.22-2.36-.3v-.44A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.67.03 2.5.08v-.33c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.33C8.33 4.03 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                {/* Motion gets a full row so the selected label is never truncated. */}
                <div>
                  <label class="mb-1 block text-[11px] font-medium text-gray-500">
                    {translateApp(props.lang, 'appearance.floatingMotion')}
                  </label>
                  <AdminSelect
                    value={String(icon.motion || 'rotate')}
                    options={motionOptions}
                    onChange$={async (value) => {
                      await patchIcon(index, { motion: value as HeroFloatingIconMotion });
                    }}
                  />
                </div>

                <div class="grid grid-cols-3 gap-2">
                  {numberFields.map((nf) => (
                    <div key={nf.key} class="min-w-0">
                      <label
                        for={`${icon.id}-${nf.key}`}
                        class="mb-1 block truncate text-[11px] font-medium text-gray-500"
                      >
                        {nf.label}
                      </label>
                      <input
                        id={`${icon.id}-${nf.key}`}
                        type="number"
                        min={nf.min}
                        max={nf.max}
                        step={1}
                        class="w-full min-w-0 rounded border px-2 py-1.5 text-xs dark:bg-gray-950"
                        value={icon[nf.key] ?? nf.fallback}
                        onInput$={async (e) => {
                          await patchIcon(index, { [nf.key]: Number((e.target as HTMLInputElement).value) });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        class="w-full rounded-lg border border-dashed border-primary-400 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-950/30"
        disabled={icons.length >= HERO_FLOATING_ICONS_MAX}
        onClick$={async () => {
          await emit([...icons, defaultHeroFloatingIcon()]);
        }}
      >
        + {translateApp(props.lang, 'appearance.floatingIconsAdd')}
      </button>

      {pickIndex.value !== null ? (
        <MediaSelector
          title={translateApp(props.lang, 'appearance.selectImage')}
          accept="image/*"
          onSelect={$((media: Media) => {
            const idx = pickIndex.value;
            pickIndex.value = null;
            if (idx === null) return;
            const url = media.url || media.thumbnailUrl || '';
            if (media.id && url && props.onPreviewUrl$) {
              props.onPreviewUrl$(media.id, url);
            }
            patchIcon(idx, { media_id: media.id });
          })}
          onClose={$(() => {
            pickIndex.value = null;
          })}
        />
      ) : null}
    </div>
  );
});
