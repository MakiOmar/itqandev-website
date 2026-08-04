import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import { AdminSelect } from '../AdminSelect';
import { AdminSwitch } from './AdminSwitch';
import { MediaSelector } from '~/components/common/MediaSelector';
import { translateApp } from '~/lib/i18n/useTranslate';
import {
  appearanceMediaPreviewSrc,
} from '~/lib/admin/appearance-media-ref';
import {
  HERO_FLOATING_ICON_MOTIONS,
  HERO_FLOATING_ICONS_MAX,
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

export const HeroFloatingIconsEditor = component$<HeroFloatingIconsEditorProps>((props) => {
  const pickIndex = useSignal<number | null>(null);
  const icons = normalizeHeroFloatingIcons(props.icons);

  const motionOptions = HERO_FLOATING_ICON_MOTIONS.map((m) => ({
    value: m,
    label: translateApp(props.lang, `appearance.floatingMotion_${m}`),
  }));

  const emit = $(async (next: HeroFloatingIcon[]) => {
    await props.onChange$(normalizeHeroFloatingIcons(next));
  });

  return (
    <div class="md:col-span-2 space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs text-gray-500 dark:text-gray-400 text-start">
          {translateApp(props.lang, 'appearance.floatingIconsHint')}
        </p>
        <button
          type="button"
          class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          disabled={icons.length >= HERO_FLOATING_ICONS_MAX}
          onClick$={async () => {
            await emit([...icons, defaultHeroFloatingIcon()]);
          }}
        >
          {translateApp(props.lang, 'appearance.floatingIconsAdd')}
        </button>
      </div>

      {icons.length === 0 ? (
        <p class="rounded-lg border border-dashed border-gray-300 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-600">
          {translateApp(props.lang, 'appearance.floatingIconsEmpty')}
        </p>
      ) : (
        <ul class="space-y-3">
          {icons.map((icon, index) => {
            const preview = appearanceMediaPreviewSrc(icon.media_id, props.mediaPreviewById);
            const previewSrc = preview ? resolveLaravelMediaUrl(preview) || preview : '';
            return (
              <li
                key={icon.id}
                class="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/40"
              >
                <div class="flex flex-wrap items-start gap-3">
                  <div class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-950">
                    {previewSrc ? (
                      <img src={previewSrc} alt="" class="h-full w-full object-contain p-1" />
                    ) : (
                      <span class="text-[10px] text-gray-400">
                        {icon.media_id ? `#${icon.media_id}` : '—'}
                      </span>
                    )}
                  </div>
                  <div class="min-w-0 flex-1 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        class="rounded-lg bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                        onClick$={() => {
                          pickIndex.value = index;
                        }}
                      >
                        {translateApp(props.lang, 'appearance.selectFromLibrary')}
                      </button>
                      {icon.media_id ? (
                        <button
                          type="button"
                          class="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600"
                          onClick$={async () => {
                            const next = icons.map((row, i) =>
                              i === index ? { ...row, media_id: null } : row,
                            );
                            await emit(next);
                          }}
                        >
                          {translateApp(props.lang, 'appearance.clear')}
                        </button>
                      ) : null}
                      <AdminSwitch
                        checked={icon.enabled !== false}
                        label={translateApp(props.lang, 'appearance.enabled')}
                        onChange$={async (enabled) => {
                          const next = icons.map((row, i) =>
                            i === index ? { ...row, enabled } : row,
                          );
                          await emit(next);
                        }}
                      />
                      <button
                        type="button"
                        class="ms-auto rounded-lg border border-red-300 px-2.5 py-1.5 text-xs text-red-600 dark:border-red-800 dark:text-red-400"
                        onClick$={async () => {
                          await emit(icons.filter((_, i) => i !== index));
                        }}
                      >
                        {translateApp(props.lang, 'appearance.remove')}
                      </button>
                    </div>
                    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label class="mb-1 block text-[11px] font-medium text-gray-500">
                          {translateApp(props.lang, 'appearance.floatingMotion')}
                        </label>
                        <AdminSelect
                          value={String(icon.motion || 'rotate')}
                          options={motionOptions}
                          onChange$={async (value) => {
                            const next = icons.map((row, i) =>
                              i === index
                                ? { ...row, motion: value as HeroFloatingIconMotion }
                                : row,
                            );
                            await emit(next);
                          }}
                        />
                      </div>
                      <div>
                        <label class="mb-1 block text-[11px] font-medium text-gray-500">
                          {translateApp(props.lang, 'appearance.floatingPosX')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          class="w-full rounded border px-2 py-1.5 text-xs dark:bg-gray-950"
                          value={icon.x ?? 0}
                          onInput$={async (e) => {
                            const x = Number((e.target as HTMLInputElement).value);
                            const next = icons.map((row, i) =>
                              i === index ? { ...row, x } : row,
                            );
                            await emit(next);
                          }}
                        />
                      </div>
                      <div>
                        <label class="mb-1 block text-[11px] font-medium text-gray-500">
                          {translateApp(props.lang, 'appearance.floatingPosY')}
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          class="w-full rounded border px-2 py-1.5 text-xs dark:bg-gray-950"
                          value={icon.y ?? 0}
                          onInput$={async (e) => {
                            const y = Number((e.target as HTMLInputElement).value);
                            const next = icons.map((row, i) =>
                              i === index ? { ...row, y } : row,
                            );
                            await emit(next);
                          }}
                        />
                      </div>
                      <div>
                        <label class="mb-1 block text-[11px] font-medium text-gray-500">
                          {translateApp(props.lang, 'appearance.floatingSize')}
                        </label>
                        <input
                          type="number"
                          min={32}
                          max={120}
                          step={1}
                          class="w-full rounded border px-2 py-1.5 text-xs dark:bg-gray-950"
                          value={icon.size ?? 56}
                          onInput$={async (e) => {
                            const size = Number((e.target as HTMLInputElement).value);
                            const next = icons.map((row, i) =>
                              i === index ? { ...row, size } : row,
                            );
                            await emit(next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

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
            const next = icons.map((row, i) =>
              i === idx ? { ...row, media_id: media.id } : row,
            );
            emit(next);
          })}
          onClose={$(() => {
            pickIndex.value = null;
          })}
        />
      ) : null}
    </div>
  );
});
