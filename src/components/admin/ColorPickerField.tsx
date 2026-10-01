import {
  component$,
  noSerialize,
  useContext,
  useSignal,
  useTask$,
  useVisibleTask$,
  type NoSerialize,
  type QRL,
} from '@builder.io/qwik';
import type Pickr from '@simonwep/pickr';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError } from '~/lib/utils/toast';
import { BuilderKitColorsContext } from '~/lib/admin/builder-kit-colors';
import { kitColorVar, type KitColorToken } from '~/lib/marketing/design-kit';
import { KIT_COLOR_VAR_RE } from '~/lib/marketing/builder-dark-styles';

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
  /**
   * Offer design-kit "Global colours" (emits `var(--kit-color-id)`). Only where the stored value
   * accepts kit vars (Style tab colours, background colour/gradient/overlay), never hex-only fields.
   */
  allowGlobal?: boolean;
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

const NO_KIT_COLORS: { colors: KitColorToken[] } = { colors: [] };

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

/** Light | dark split swatch so editors see both kit values at once. */
const KitSwatch = component$<{ token: KitColorToken }>((props) => (
  <span
    class="inline-block h-4 w-4 shrink-0 rounded-full border border-gray-300 dark:border-gray-600"
    style={{
      background: `linear-gradient(135deg, ${props.token.light} 50%, ${props.token.dark || props.token.light} 50%)`,
    }}
  />
));

/** Popover listing kit colours; picking one stores the var so it follows kit edits and the theme scope. */
const GlobalColorsMenu = component$<{
  lang?: string;
  colors: KitColorToken[];
  selectedId: string | null;
  onPick$: QRL<(id: string) => void>;
}>((props) => {
  const open = useSignal(false);
  const rootRef = useSignal<HTMLSpanElement>();
  const title = translateApp(props.lang, 'builder.colorPicker.globalColors');
  return (
    <span
      ref={rootRef}
      class="relative self-end"
      document:onPointerDown$={(e) => {
        if (open.value && rootRef.value && !rootRef.value.contains(e.target as Node)) open.value = false;
      }}
      window:onKeyDown$={(e) => {
        if (open.value && e.key === 'Escape') open.value = false;
      }}
    >
      <button
        type="button"
        class={[
          'inline-flex h-8 w-8 items-center justify-center rounded border',
          props.selectedId
            ? 'border-primary-500 text-primary-600 dark:text-primary-300'
            : 'border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
        ].join(' ')}
        aria-label={title}
        aria-expanded={open.value ? 'true' : 'false'}
        title={title}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        {/* Globe icon (inline SVG, self-hosted) */}
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
      </button>
      {open.value ? (
        <span
          role="listbox"
          aria-label={title}
          class="absolute end-0 top-full z-50 mt-1 block w-52 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-slate-800"
        >
          <span class="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {title}
          </span>
          {props.colors.map((token) => (
            <button
              key={token.id}
              type="button"
              role="option"
              aria-selected={props.selectedId === token.id ? 'true' : 'false'}
              class={[
                'flex w-full items-center gap-2 rounded px-2 py-1 text-start text-xs',
                props.selectedId === token.id
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-700',
              ].join(' ')}
              onClick$={async () => {
                open.value = false;
                await props.onPick$(token.id);
              }}
            >
              <KitSwatch token={token} />
              <span class="truncate capitalize">{token.name}</span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
});

/**
 * Elementor-style colour picker (Pickr, "monolith" theme). Pickr and its CSS are loaded on first open only.
 */
export const ColorPickerField = component$<ColorPickerFieldProps>((props) => {
  const buttonRef = useSignal<HTMLButtonElement>();
  const picker = useSignal<NoSerialize<Pickr>>();
  const loading = useSignal(false);
  /** Last value emitted by the picker; echoing it back via setColor would cause drag jitter. */
  const lastEmitted = useSignal<string | null>(null);
  const kit = useContext(BuilderKitColorsContext, NO_KIT_COLORS);
  const globals = props.allowGlobal ? kit.colors : [];

  const value = typeof props.value === 'string' ? props.value.trim() : '';
  const isKitVar = KIT_COLOR_VAR_RE.test(value);
  const safeValue = SAFE_COLOR_RE.test(value) || isKitVar ? value : '';
  const kitToken = isKitVar ? globals.find((t) => kitColorVar(t.id) === value) ?? null : null;

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

  const pickerButton = (
    <button
      ref={buttonRef}
      type="button"
      class={[
        'relative inline-block shrink-0 cursor-pointer overflow-hidden rounded border border-gray-300 dark:border-gray-600',
        loading.value ? 'animate-pulse' : '',
        props.class || 'h-9 w-12',
        globals.length > 0 && /\bw-full\b/.test(props.class || '') ? 'min-w-0 flex-1' : '',
      ].join(' ')}
      style={{ background: CHECKER }}
      aria-label={props.label || translateApp(props.lang, 'builder.colorPicker.open')}
      title={kitToken ? `${translateApp(props.lang, 'builder.colorPicker.globalColors')}: ${kitToken.name}` : safeValue || undefined}
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
      {kitToken ? (
        <span class="absolute bottom-0.5 start-0.5 rounded bg-black/60 px-1 text-[9px] font-medium capitalize leading-tight text-white">
          {kitToken.name}
        </span>
      ) : null}
    </button>
  );

  if (globals.length === 0) return pickerButton;

  return (
    <span class={[/\bw-full\b/.test(props.class || '') ? 'flex w-full' : 'inline-flex max-w-full', 'items-end gap-1'].join(' ')}>
      {pickerButton}
      <GlobalColorsMenu
        lang={props.lang}
        colors={globals}
        selectedId={kitToken?.id ?? null}
        onPick$={async (id: string) => {
          lastEmitted.value = kitColorVar(id);
          await props.onChange$(kitColorVar(id));
        }}
      />
    </span>
  );
});
