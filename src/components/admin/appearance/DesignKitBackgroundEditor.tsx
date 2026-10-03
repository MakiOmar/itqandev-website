import { component$, $, type QRL } from '@builder.io/qwik';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { translateApp } from '~/lib/i18n/useTranslate';
import {
  ADMIN_FORM_INPUT_CLASS,
  ADMIN_FORM_LABEL_CLASS,
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_CLASS,
} from '~/lib/admin/native-select-classes';

export type PageBackgroundType = 'theme' | 'color' | 'gradient';

export type PageBackground = {
  type: PageBackgroundType;
  color: string;
  color_end: string;
  angle: number;
};

export type PageBackgrounds = { light: PageBackground; dark: PageBackground };

export type ThemeModeKey = keyof PageBackgrounds;

const TYPES: readonly PageBackgroundType[] = ['theme', 'color', 'gradient'];

/** Fallbacks for the picker swatch only; nothing is saved until a colour is chosen. */
const SWATCH_FALLBACK: Record<ThemeModeKey, string> = { light: '#f8fafc', dark: '#0f172a' };

/** Fill missing modes/keys so older saved kits (no `background`) edit cleanly. */
export function normalizePageBackgrounds(raw: unknown): PageBackgrounds {
  const bag = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const one = (v: unknown): PageBackground => {
    const r = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
    const type = TYPES.includes(r.type as PageBackgroundType) ? (r.type as PageBackgroundType) : 'theme';
    const angle = Number(r.angle);
    return {
      type,
      color: typeof r.color === 'string' ? r.color : '',
      color_end: typeof r.color_end === 'string' ? r.color_end : '',
      angle: Number.isFinite(angle) ? Math.max(0, Math.min(360, Math.round(angle))) : 135,
    };
  };
  return { light: one(bag.light), dark: one(bag.dark) };
}

/** CSS preview of one mode, matching `DesignKitResolver::backgroundValue`. */
function previewCss(bg: PageBackground, mode: ThemeModeKey): string {
  if (bg.type === 'color' && bg.color) return bg.color;
  if (bg.type === 'gradient' && bg.color) return `linear-gradient(${bg.angle}deg, ${bg.color}, ${bg.color_end || bg.color})`;
  return mode === 'dark'
    ? 'linear-gradient(135deg, #0f172a, rgb(30 41 59 / 0.3), rgb(15 23 42 / 0.2))'
    : 'linear-gradient(135deg, #f8fafc, rgb(239 246 255 / 0.3), rgb(238 242 255 / 0.2))';
}

type ModeEditorProps = {
  lang: string;
  mode: ThemeModeKey;
  value: PageBackground;
  onChange$: QRL<(mode: ThemeModeKey, next: PageBackground) => void>;
};

const ModeEditor = component$<ModeEditorProps>((props) => {
  const t = (key: string) => translateApp(props.lang, `designKit.${key}`);
  const modeLabel = translateApp(props.lang, props.mode === 'dark' ? 'builder.style.modeDark' : 'builder.style.modeLight');
  const bg = props.value;
  const patch$ = $((next: Partial<PageBackground>) => props.onChange$(props.mode, { ...props.value, ...next }));

  return (
    <div class="space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      {/* Mode heading with a live swatch of the resulting background */}
      <div class="flex items-center justify-between gap-2">
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">{modeLabel}</span>
        <span
          class="inline-block h-8 w-16 rounded border border-gray-300 dark:border-gray-600"
          style={{ background: previewCss(bg, props.mode) }}
          aria-hidden="true"
        />
      </div>
      <div>
        <label class={ADMIN_FORM_LABEL_CLASS} for={`kit-bg-type-${props.mode}`}>
          {t('backgroundType')}
        </label>
        <select
          id={`kit-bg-type-${props.mode}`}
          class={ADMIN_NATIVE_SELECT_CLASS}
          value={bg.type}
          onChange$={(_, el) => patch$({ type: el.value as PageBackgroundType })}
        >
          {TYPES.map((type) => (
            <option key={type} value={type} class={ADMIN_NATIVE_OPTION_CLASS} selected={type === bg.type}>
              {t(`backgroundType_${type}`)}
            </option>
          ))}
        </select>
      </div>
      {bg.type === 'theme' ? (
        <p class="text-xs text-gray-500 dark:text-gray-400">{t('backgroundThemeHint')}</p>
      ) : (
        <div class="flex flex-wrap items-end gap-4">
          {/* Start colour (or the solid colour) */}
          <div>
            <span class={ADMIN_FORM_LABEL_CLASS}>{bg.type === 'gradient' ? t('backgroundStart') : t('backgroundColor')}</span>
            <ColorPickerField
              value={bg.color}
              fallback={SWATCH_FALLBACK[props.mode]}
              alpha
              lang={props.lang}
              label={`${t('backgroundColor')} (${modeLabel})`}
              onChange$={(next) => patch$({ color: next })}
            />
          </div>
          {bg.type === 'gradient' ? (
            <>
              <div>
                <span class={ADMIN_FORM_LABEL_CLASS}>{t('backgroundEnd')}</span>
                <ColorPickerField
                  value={bg.color_end}
                  fallback={bg.color || SWATCH_FALLBACK[props.mode]}
                  alpha
                  clearable
                  lang={props.lang}
                  label={`${t('backgroundEnd')} (${modeLabel})`}
                  onChange$={(next) => patch$({ color_end: next })}
                />
              </div>
              <div class="w-24">
                <label class={ADMIN_FORM_LABEL_CLASS} for={`kit-bg-angle-${props.mode}`}>
                  {t('backgroundAngle')}
                </label>
                <input
                  id={`kit-bg-angle-${props.mode}`}
                  type="number"
                  min={0}
                  max={360}
                  class={ADMIN_FORM_INPUT_CLASS}
                  value={bg.angle}
                  onChange$={(_, el) => patch$({ angle: Math.max(0, Math.min(360, Math.round(Number(el.value) || 0))) })}
                />
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
});

export type DesignKitBackgroundEditorProps = {
  lang: string;
  value: PageBackgrounds;
  onChange$: QRL<(next: PageBackgrounds) => void>;
};

/** Site-wide page background (light + dark), like Elementor's Site Settings → Background. */
export const DesignKitBackgroundEditor = component$<DesignKitBackgroundEditorProps>((props) => {
  const setMode$ = $((mode: ThemeModeKey, next: PageBackground) => props.onChange$({ ...props.value, [mode]: next }));

  return (
    <section class="space-y-3">
      <div>
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">
          {translateApp(props.lang, 'designKit.backgroundTitle')}
        </h2>
        <p class="text-sm text-gray-600 dark:text-gray-400">{translateApp(props.lang, 'designKit.backgroundHint')}</p>
      </div>
      <div class="grid gap-3 md:grid-cols-2">
        <ModeEditor lang={props.lang} mode="light" value={props.value.light} onChange$={setMode$} />
        <ModeEditor lang={props.lang} mode="dark" value={props.value.dark} onChange$={setMode$} />
      </div>
    </section>
  );
});
