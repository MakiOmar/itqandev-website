import { component$, type QRL } from '@builder.io/qwik';
import {
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
          <input
            type="color"
            class="mt-1 h-9 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-600"
            value={/^#/.test(bg.color || '') ? bg.color! : '#0389a1'}
            onInput$={async (e) => {
              await patch({ color: (e.target as HTMLInputElement).value });
            }}
          />
        </label>
      ) : null}

      {bg.type === 'gradient' ? (
        <div class="grid gap-3 sm:grid-cols-2">
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.gradientFrom')}
            <input
              type="color"
              class="mt-1 h-9 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              value={bg.gradient_from || '#0389a1'}
              onInput$={async (e) => {
                await patch({ gradient_from: (e.target as HTMLInputElement).value });
              }}
            />
          </label>
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.gradientTo')}
            <input
              type="color"
              class="mt-1 h-9 w-full cursor-pointer rounded border border-gray-300 dark:border-gray-600"
              value={bg.gradient_to || '#0ea5e9'}
              onInput$={async (e) => {
                await patch({ gradient_to: (e.target as HTMLInputElement).value });
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
          <label class={ADMIN_FORM_LABEL_CLASS}>
            {translateApp(props.lang, 'builder.background.imageUrl')}
            <input
              type="url"
              class={`${ADMIN_FORM_INPUT_CLASS} mt-1`}
              value={bg.image_url || ''}
              placeholder="https://…"
              onInput$={async (e) => {
                await patch({ image_url: (e.target as HTMLInputElement).value });
              }}
            />
          </label>
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
