import { $, component$, useSignal, type QRL } from '@builder.io/qwik';
import {
  ADMIN_CHECKBOX_CLASS,
  ADMIN_CHECKBOX_LABEL_CLASS,
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';
import {
  readBuilderBackground,
  type BuilderBackground,
  type BuilderBackgroundType,
} from '~/lib/marketing/builder-background';
import { translateApp } from '~/lib/i18n/useTranslate';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { MediaSelector } from '~/components/common/MediaSelector';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import type { Media } from '~/types/media';

export type BuilderBackgroundFieldsProps = {
  lang: string;
  settings: Record<string, unknown> | undefined;
  onChange$: QRL<(next: Record<string, unknown>) => void>;
};

const BACKGROUND_TYPES: BuilderBackgroundType[] = [
  'none',
  'color',
  'gradient',
  'image',
  'particles',
  'animated_rain',
];

export const BuilderBackgroundFields = component$<BuilderBackgroundFieldsProps>((props) => {
  const bg = readBuilderBackground(props.settings);
  const pickerOpen = useSignal(false);
  const previewSrc = bg.image_url ? resolveLaravelMediaUrl(bg.image_url) || bg.image_url : '';

  const patch = async (partial: Partial<BuilderBackground>) => {
    const next: BuilderBackground = { ...bg, ...partial };
    await props.onChange$({
      ...(props.settings ?? {}),
      background: next,
    });
  };

  return (
    <div class="space-y-3">
      <label class={ADMIN_FORM_LABEL_CLASS}>
        {translateApp(props.lang, 'builder.background.type')}
        <select
          class={`${ADMIN_NATIVE_SELECT_CLASS} mt-1`}
          value={bg.type}
          onChange$={async (e) => {
            const type = (e.target as HTMLSelectElement).value as BuilderBackgroundType;
            // Selecting a type must paint immediately — color/image need defaults or they stay invisible.
            if (type === 'color') {
              await patch({ type, color: bg.color || '#0389a1' });
            } else if (type === 'gradient') {
              await patch({
                type,
                gradient_from: bg.gradient_from || '#0389a1',
                gradient_to: bg.gradient_to || '#0ea5e9',
                gradient_angle: bg.gradient_angle ?? 135,
              });
            } else {
              await patch({ type });
            }
          }}
        >
          {BACKGROUND_TYPES.map((t) => (
            <option key={t} class={ADMIN_NATIVE_OPTION_CLASS} value={t}>
              {translateApp(props.lang, `builder.background.types.${t}`)}
            </option>
          ))}
        </select>
      </label>

      {bg.type === 'color' ? (
        <label class={ADMIN_FORM_LABEL_CLASS}>
          {translateApp(props.lang, 'builder.background.color')}
          <ColorPickerField
            value={/^#/.test(bg.color || '') ? bg.color! : '#0389a1'}
            lang={props.lang}
            class="mt-1 block h-9 w-full"
            label={translateApp(props.lang, 'builder.background.color')}
            onChange$={async (next) => {
              await patch({ color: next || '#0389a1' });
            }}
          />
        </label>
      ) : null}

      {bg.type === 'gradient' ? (
        <div class="grid gap-3 sm:grid-cols-2">
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.gradientFrom')}
            <ColorPickerField
              value={bg.gradient_from || '#0389a1'}
              lang={props.lang}
              class="mt-1 block h-9 w-full"
              label={translateApp(props.lang, 'builder.background.gradientFrom')}
              onChange$={async (next) => {
                await patch({ gradient_from: next || '#0389a1' });
              }}
            />
          </label>
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.gradientTo')}
            <ColorPickerField
              value={bg.gradient_to || '#0ea5e9'}
              lang={props.lang}
              class="mt-1 block h-9 w-full"
              label={translateApp(props.lang, 'builder.background.gradientTo')}
              onChange$={async (next) => {
                await patch({ gradient_to: next || '#0ea5e9' });
              }}
            />
          </label>
          <label class={`${ADMIN_FORM_LABEL_CLASS} sm:col-span-2`}>
            {translateApp(props.lang, 'builder.background.gradientAngle')}
            <input
              type="number"
              min={0}
              max={360}
              class={`${ADMIN_FORM_INPUT_CLASS} mt-1`}
              value={bg.gradient_angle ?? 135}
              onInput$={async (e) => {
                await patch({ gradient_angle: Number((e.target as HTMLInputElement).value) });
              }}
            />
          </label>
        </div>
      ) : null}

      {bg.type === 'image' ? (
        <div class="space-y-3">
          {/* Image comes from the media library; the URL is kept on the node so rendering needs no lookup */}
          <div>
            <span class={ADMIN_FORM_LABEL_CLASS}>{translateApp(props.lang, 'builder.background.image')}</span>
            <div class="mt-1 flex items-start gap-3">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt=""
                  width={96}
                  height={64}
                  class="h-16 w-24 shrink-0 rounded border border-gray-200 object-cover dark:border-gray-600"
                />
              ) : (
                <div class="flex h-16 w-24 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 text-center text-[11px] text-gray-400 dark:border-gray-600">
                  {translateApp(props.lang, 'appearance.noImage')}
                </div>
              )}
              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                  onClick$={() => {
                    pickerOpen.value = true;
                  }}
                >
                  {translateApp(props.lang, 'appearance.selectFromLibrary')}
                </button>
                {bg.image_url ? (
                  <button
                    type="button"
                    class="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-600 dark:text-gray-200"
                    onClick$={async () => {
                      await patch({ image_url: undefined, image_id: undefined });
                    }}
                  >
                    {translateApp(props.lang, 'appearance.clear')}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {pickerOpen.value ? (
            <MediaSelector
              title={translateApp(props.lang, 'appearance.selectImage')}
              accept="image/*"
              onSelect={$(async (media: Media) => {
                pickerOpen.value = false;
                const url = media.url || media.thumbnailUrl || '';
                if (!url) return;
                await patch({ image_url: url, image_id: typeof media.id === 'number' ? media.id : undefined });
              })}
              onClose={$(() => {
                pickerOpen.value = false;
              })}
            />
          ) : null}
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.imageSize')}
            <select
              class={`${ADMIN_NATIVE_SELECT_CLASS} mt-1`}
              value={bg.image_size || 'cover'}
              onChange$={async (e) => {
                await patch({
                  image_size: (e.target as HTMLSelectElement).value as 'cover' | 'contain' | 'auto',
                });
              }}
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="cover">
                cover
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="contain">
                contain
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="auto">
                auto
              </option>
            </select>
          </label>

          {/* Colour overlay over the image (e.g. to keep text readable) */}
          <label class={ADMIN_CHECKBOX_LABEL_CLASS}>
            <input
              type="checkbox"
              class={ADMIN_CHECKBOX_CLASS}
              checked={bg.overlay === true}
              onChange$={async (e) => {
                await patch({ overlay: (e.target as HTMLInputElement).checked });
              }}
            />
            {translateApp(props.lang, 'builder.background.overlay')}
          </label>
          {bg.overlay ? (
            <div class="grid gap-3 sm:grid-cols-2">
              <label class={ADMIN_FORM_LABEL_CLASS}>
                {translateApp(props.lang, 'builder.background.overlayColor')}
                <ColorPickerField
                  value={bg.overlay_color || '#000000'}
                  lang={props.lang}
                  class="mt-1 block h-9 w-full"
                  label={translateApp(props.lang, 'builder.background.overlayColor')}
                  onChange$={async (next) => {
                    await patch({ overlay_color: next || '#000000' });
                  }}
                />
              </label>
              <label class={ADMIN_FORM_LABEL_CLASS}>
                {translateApp(props.lang, 'builder.background.overlayOpacity')} ({bg.overlay_opacity ?? 50}%)
                <input
                  type="range"
                  min={0}
                  max={100}
                  class="mt-1 w-full"
                  value={bg.overlay_opacity ?? 50}
                  onInput$={async (e) => {
                    await patch({ overlay_opacity: Number((e.target as HTMLInputElement).value) });
                  }}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {bg.type === 'particles' ? (
        <div class="grid gap-3 sm:grid-cols-2">
          {(
            [
              ['particles_density', 'builder.background.density', bg.particles_density],
              ['particles_speed', 'builder.background.speed', bg.particles_speed],
              ['particles_opacity', 'builder.background.opacity', bg.particles_opacity],
              ['particles_size', 'builder.background.size', bg.particles_size],
            ] as const
          ).map(([key, labelKey, val]) => (
            <label key={key} class={ADMIN_FORM_LABEL_CLASS}>
              {translateApp(props.lang, labelKey)}
              <input
                type="range"
                min={10}
                max={100}
                class="mt-1 w-full"
                value={val ?? 50}
                onInput$={async (e) => {
                  await patch({ [key]: Number((e.target as HTMLInputElement).value) } as Partial<BuilderBackground>);
                }}
              />
            </label>
          ))}
          <label class={`${ADMIN_FORM_LABEL_CLASS} sm:col-span-2`}>
            {translateApp(props.lang, 'builder.background.colorOptional')}
            <input
              type="text"
              class={`${ADMIN_FORM_INPUT_CLASS} mt-1`}
              value={bg.particles_color || ''}
              placeholder="#0389a1"
              onInput$={async (e) => {
                await patch({ particles_color: (e.target as HTMLInputElement).value });
              }}
            />
          </label>
        </div>
      ) : null}

      {bg.type === 'animated_rain' ? (
        <div class="grid gap-3 sm:grid-cols-2">
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.rainDirection')}
            <select
              class={`${ADMIN_NATIVE_SELECT_CLASS} mt-1`}
              value={bg.rain_direction || 'down'}
              onChange$={async (e) => {
                await patch({
                  rain_direction: (e.target as HTMLSelectElement).value as 'down' | 'up' | 'both',
                });
              }}
            >
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="down">
                {translateApp(props.lang, 'builder.background.rainDown')}
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="up">
                {translateApp(props.lang, 'builder.background.rainUp')}
              </option>
              <option class={ADMIN_NATIVE_OPTION_CLASS} value="both">
                {translateApp(props.lang, 'builder.background.rainBoth')}
              </option>
            </select>
          </label>
          {(
            [
              ['rain_speed', 'builder.background.speed', bg.rain_speed],
              ['rain_density', 'builder.background.density', bg.rain_density],
            ] as const
          ).map(([key, labelKey, val]) => (
            <label key={key} class={ADMIN_FORM_LABEL_CLASS}>
              {translateApp(props.lang, labelKey)}
              <input
                type="range"
                min={10}
                max={100}
                class="mt-1 w-full"
                value={val ?? 50}
                onInput$={async (e) => {
                  await patch({ [key]: Number((e.target as HTMLInputElement).value) } as Partial<BuilderBackground>);
                }}
              />
            </label>
          ))}
          <label class={`${ADMIN_FORM_LABEL_CLASS} sm:col-span-2`}>
            {translateApp(props.lang, 'builder.background.colorOptional')}
            <input
              type="text"
              class={`${ADMIN_FORM_INPUT_CLASS} mt-1`}
              value={bg.rain_color || ''}
              placeholder="#64748b"
              onInput$={async (e) => {
                await patch({ rain_color: (e.target as HTMLInputElement).value });
              }}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
});
