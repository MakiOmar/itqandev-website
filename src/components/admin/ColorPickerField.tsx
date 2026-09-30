import {
  component$,
  noSerialize,
  useSignal,
  useTask$,
  useVisibleTask$,
  type NoSerialize,
  type QRL,
} from '@builder.io/qwik';
import type Pickr from '@simonwep/pickr';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError } from '~/lib/utils/toast';

export type ColorPickerFieldProps = {
  value: string;
  onChange$: QRL<(next: string) => void>;
  lang?: string;
  /** Opacity slider; output becomes #rrggbbaa when below 100%. Off where the stored value must stay #rrggbb. */
  alpha?: boolean;
  /** Shows Pickr's Clear button, emitting ''. */
  clearable?: boolean;
  /** Colour shown in the picker when the value is empty. */
  fallback?: string;
  label?: string;
  class?: string;
};

const SAFE_COLOR_RE = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i;

const DEFAULT_SWATCHES = [
  '#0389a1',
  '#0ea5e9',
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#111827',
  '#6b7280',
  '#e5e7eb',
  '#ffffff',
];

/** Adds the theme stylesheet once; `?url` keeps it out of the shared CSS bundle. */
async function loadPickrTheme(): Promise<void> {
  if (document.querySelector('link[data-pickr-theme]')) return;
  const { default: href } = await import('@simonwep/pickr/dist/themes/monolith.min.css?url');
  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-pickr-theme', '');
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

const CHECKER =
  'repeating-conic-gradient(#d1d5db 0% 25%, #ffffff 0% 50%) 50% / 10px 10px';

/**
 * Elementor-style colour picker (Pickr, "monolith" theme). Pickr and its CSS are loaded on first open only.
 */
export const ColorPickerField = component$<ColorPickerFieldProps>((props) => {
  const buttonRef = useSignal<HTMLButtonElement>();
  const picker = useSignal<NoSerialize<Pickr>>();
  const loading = useSignal(false);
  /** Last value emitted by the picker; echoing it back via setColor would cause drag jitter. */
  const lastEmitted = useSignal<string | null>(null);

  const value = typeof props.value === 'string' ? props.value.trim() : '';
  const safeValue = SAFE_COLOR_RE.test(value) ? value : '';

  useTask$(({ track }) => {
    const next = track(() => (typeof props.value === 'string' ? props.value.trim() : ''));
    const instance = picker.value;
    if (!instance || next === lastEmitted.value) return;
    instance.setColor(SAFE_COLOR_RE.test(next) ? next : null, true);
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    cleanup(() => picker.value?.destroyAndRemove());
  });

  return (
    <button
      ref={buttonRef}
      type="button"
      class={[
        'relative inline-block shrink-0 cursor-pointer overflow-hidden rounded border border-gray-300 dark:border-gray-600',
        loading.value ? 'animate-pulse' : '',
        props.class || 'h-9 w-12',
      ].join(' ')}
      style={{ background: CHECKER }}
      aria-label={props.label || translateApp(props.lang, 'builder.colorPicker.open')}
      title={safeValue || undefined}
      onClick$={async () => {
        // After init Pickr owns the button's click (toggle); only the first click creates it.
        if (picker.value || loading.value || !buttonRef.value) return;
        loading.value = true;
        try {
          const [{ default: PickrLib }] = await Promise.all([import('@simonwep/pickr'), loadPickrTheme()]);
          const alpha = props.alpha !== false;
          const current = typeof props.value === 'string' ? props.value.trim() : '';
          const instance = PickrLib.create({
            el: buttonRef.value,
            useAsButton: true,
            theme: 'monolith',
            default: SAFE_COLOR_RE.test(current) ? current : props.fallback || '#0389a1',
            swatches: DEFAULT_SWATCHES,
            lockOpacity: !alpha,
            comparison: false,
            defaultRepresentation: 'HEXA',
            components: {
              preview: true,
              opacity: alpha,
              hue: true,
              interaction: { input: true, clear: props.clearable === true },
            },
            i18n: {
              'btn:clear': translateApp(props.lang, 'appearance.clear'),
              'aria:btn:clear': translateApp(props.lang, 'appearance.clear'),
            },
          });
          const emit = (color: Pickr.HSVaColor | null) => {
            if (!color) return;
            const hex = color.toHEXA().toString().toLowerCase();
            lastEmitted.value = hex;
            void props.onChange$(hex);
          };
          instance.on('change', emit);
          instance.on('swatchselect', emit);
          instance.on('clear', () => {
            lastEmitted.value = '';
            void props.onChange$('');
          });
          instance.on('init', (p: Pickr) => p.show());
          picker.value = noSerialize(instance);
        } catch (err) {
          console.error('[ColorPickerField] failed to load picker', err);
          showError(translateApp(props.lang, 'builder.colorPicker.loadError'));
        } finally {
          loading.value = false;
        }
      }}
    >
      {/* Current colour over a transparency checkerboard */}
      <span class="absolute inset-0" style={safeValue ? { background: safeValue } : undefined} />
    </button>
  );
});
