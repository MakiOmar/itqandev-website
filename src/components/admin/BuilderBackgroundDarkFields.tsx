import { $, component$, useSignal, type QRL } from '@builder.io/qwik';
import {
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
} from '~/lib/admin/native-select-classes';
import type { BuilderBackground, BuilderBackgroundDark } from '~/lib/marketing/builder-background';
import { translateApp } from '~/lib/i18n/useTranslate';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { MediaSelector } from '~/components/common/MediaSelector';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import type { Media } from '~/types/media';

export type BuilderBackgroundDarkFieldsProps = {
  lang: string;
  bg: BuilderBackground;
  onPatch$: QRL<(partial: Partial<BuilderBackgroundDark>) => void>;
};

/** Label row with a "Same as light" action that clears the dark override. */
const DarkLabel = component$<{
  lang: string;
  labelKey: string;
  set: boolean;
  onClear$: QRL<() => void>;
}>((props) => {
  return (
    <span class="flex items-center justify-between gap-2">
      {translateApp(props.lang, props.labelKey)}
      {props.set ? (
        <button
          type="button"
          class="text-[10px] font-medium text-primary-600 hover:underline dark:text-primary-400"
          onClick$={props.onClear$}
        >
          {translateApp(props.lang, 'builder.style.sameAsLight')}
        </button>
      ) : null}
    </span>
  );
});

const DarkColor = component$<{
  lang: string;
  labelKey: string;
  value: string | undefined;
  lightValue: string | undefined;
  onPatch$: QRL<(value: string | undefined) => void>;
}>((props) => {
  return (
    <label class={ADMIN_FORM_LABEL_CLASS}>
      <DarkLabel
        lang={props.lang}
        labelKey={props.labelKey}
        set={!!props.value}
        onClear$={$(() => props.onPatch$(undefined))}
      />
      <ColorPickerField
        value={props.value || ''}
        fallback={props.lightValue || '#0f172a'}
        lang={props.lang}
        class="mt-1 block h-9 w-full"
        label={translateApp(props.lang, props.labelKey)}
        onChange$={(next) => props.onPatch$(next || undefined)}
      />
    </label>
  );
});

/** Canvas-drawn colours (particles, rain) need plain hex, so they keep a text input. */
const DarkHexInput = component$<{
  lang: string;
  value: string | undefined;
  lightValue: string | undefined;
  onPatch$: QRL<(value: string | undefined) => void>;
}>((props) => {
  return (
    <label class={ADMIN_FORM_LABEL_CLASS}>
      <DarkLabel
        lang={props.lang}
        labelKey="builder.background.colorOptional"
        set={!!props.value}
        onClear$={$(() => props.onPatch$(undefined))}
      />
      <input
        type="text"
        class={`${ADMIN_FORM_INPUT_CLASS} mt-1`}
        value={props.value || ''}
        placeholder={props.lightValue || translateApp(props.lang, 'builder.style.themeDefault')}
        onInput$={(e) => {
          const v = (e.target as HTMLInputElement).value.trim();
          props.onPatch$(v || undefined);
        }}
      />
    </label>
  );
});

/** Dark-mode background overrides: colours and the image; type and layout follow Light. */
export const BuilderBackgroundDarkFields = component$<BuilderBackgroundDarkFieldsProps>((props) => {
  const pickerOpen = useSignal(false);
  const bg = props.bg;
  const dark = bg.dark ?? {};
  const darkImage = dark.image_url ? resolveLaravelMediaUrl(dark.image_url) || dark.image_url : '';

  if (bg.type === 'none') {
    return (
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'builder.background.darkNeedsType')}
      </p>
    );
  }

  return (
    <div class="space-y-3">
      <p class="text-[11px] leading-snug text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'builder.background.darkHint')}
      </p>

      {bg.type === 'color' ? (
        <DarkColor
          lang={props.lang}
          labelKey="builder.background.color"
          value={dark.color}
          lightValue={bg.color}
          onPatch$={$((color: string | undefined) => props.onPatch$({ color }))}
        />
      ) : null}

      {bg.type === 'gradient' ? (
        <div class="grid gap-3 sm:grid-cols-2">
          <DarkColor
            lang={props.lang}
            labelKey="builder.background.gradientFrom"
            value={dark.gradient_from}
            lightValue={bg.gradient_from}
            onPatch$={$((gradient_from: string | undefined) => props.onPatch$({ gradient_from }))}
          />
          <DarkColor
            lang={props.lang}
            labelKey="builder.background.gradientTo"
            value={dark.gradient_to}
            lightValue={bg.gradient_to}
            onPatch$={$((gradient_to: string | undefined) => props.onPatch$({ gradient_to }))}
          />
        </div>
      ) : null}

      {bg.type === 'image' ? (
        <div class="space-y-3">
          {/* Optional dark image; only the active mode's image is downloaded */}
          <div>
            <span class={ADMIN_FORM_LABEL_CLASS}>
              <DarkLabel
                lang={props.lang}
                labelKey="builder.background.darkImage"
                set={!!dark.image_url}
                onClear$={$(() => props.onPatch$({ image_url: undefined, image_id: undefined }))}
              />
            </span>
            <div class="mt-1 flex items-start gap-3">
              {darkImage ? (
                <img
                  src={darkImage}
                  alt=""
                  width={96}
                  height={64}
                  class="h-16 w-24 shrink-0 rounded border border-gray-200 object-cover dark:border-gray-600"
                />
              ) : (
                <div class="flex h-16 w-24 shrink-0 items-center justify-center rounded border border-dashed border-gray-300 px-1 text-center text-[11px] text-gray-400 dark:border-gray-600">
                  {translateApp(props.lang, 'builder.style.sameAsLight')}
                </div>
              )}
              <button
                type="button"
                class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
                onClick$={() => {
                  pickerOpen.value = true;
                }}
              >
                {translateApp(props.lang, 'appearance.selectFromLibrary')}
              </button>
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
                await props.onPatch$({ image_url: url, image_id: typeof media.id === 'number' ? media.id : undefined });
              })}
              onClose={$(() => {
                pickerOpen.value = false;
              })}
            />
          ) : null}
          {bg.overlay ? (
            <div class="grid gap-3 sm:grid-cols-2">
              <DarkColor
                lang={props.lang}
                labelKey="builder.background.overlayColor"
                value={dark.overlay_color}
                lightValue={bg.overlay_color}
                onPatch$={$((overlay_color: string | undefined) => props.onPatch$({ overlay_color }))}
              />
              <label class={ADMIN_FORM_LABEL_CLASS}>
                <DarkLabel
                  lang={props.lang}
                  labelKey="builder.background.overlayOpacity"
                  set={dark.overlay_opacity !== undefined}
                  onClear$={$(() => props.onPatch$({ overlay_opacity: undefined }))}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  class="mt-1 w-full"
                  value={dark.overlay_opacity ?? bg.overlay_opacity ?? 50}
                  onInput$={(e) => props.onPatch$({ overlay_opacity: Number((e.target as HTMLInputElement).value) })}
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      {bg.type === 'particles' ? (
        <DarkHexInput
          lang={props.lang}
          value={dark.particles_color}
          lightValue={bg.particles_color}
          onPatch$={$((particles_color: string | undefined) => props.onPatch$({ particles_color }))}
        />
      ) : null}

      {bg.type === 'animated_rain' ? (
        <DarkHexInput
          lang={props.lang}
          value={dark.rain_color}
          lightValue={bg.rain_color}
          onPatch$={$((rain_color: string | undefined) => props.onPatch$({ rain_color }))}
        />
      ) : null}
    </div>
  );
});
