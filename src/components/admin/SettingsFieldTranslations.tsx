import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
  useStore,
  useTask$,
  Slot,
  type QRL,
  type Signal,
} from '@builder.io/qwik';
import type { SiteLanguageRow } from '../../types/site-language';
import {
  parseSettingsTranslations,
  serializeSettingsTranslations,
  pathTranslation,
  setPathTranslation,
  type SettingsScalarField,
  type SettingsTranslationsMap,
} from '../../lib/admin/settings-translations';
import { useTranslate } from '../../lib/i18n/useTranslate';

interface SettingsTranslationsContextValue {
  locales: SiteLanguageRow[];
  /** Dashboard language. When this is a secondary locale, the main fields edit it and the globe lists the others. */
  activeLocale: string;
  store: SettingsTranslationsMap;
  hiddenJson: Signal<string>;
  rtlBadge: string;
  fallbackHintShort: string;
}

/** True when the dashboard language is the site default, so the main fields are the primary settings keys. */
export function dashboardEditsPrimarySettings(uiLocale: string, defaultLocale: string | undefined): boolean {
  const ui = String(uiLocale || '').trim().toLowerCase();
  const def = String(defaultLocale || 'en').trim().toLowerCase();
  return ui === '' || ui === def;
}

export const settingsTranslationsContext = createContextId<SettingsTranslationsContextValue>(
  'admin.settings-translations',
);

/**
 * Hidden `settings_translations_json` + per-field globe editors for secondary locales.
 */
export const SettingsTranslationsRoot = component$<{
  locales: SiteLanguageRow[];
  initialTranslations: SettingsTranslationsMap;
  rtlBadge: string;
  fallbackHintShort: string;
  /** Current dashboard language (`en`, `ar`, …). */
  activeLocale?: string;
}>((props) => {
  const hiddenJson = useSignal(serializeSettingsTranslations(props.initialTranslations));
  const store = useStore<SettingsTranslationsMap>({});

  useContextProvider(settingsTranslationsContext, {
    locales: props.locales,
    activeLocale: String(props.activeLocale || '').toLowerCase(),
    store,
    hiddenJson,
    rtlBadge: props.rtlBadge,
    fallbackHintShort: props.fallbackHintShort,
  });

  useTask$(({ track }) => {
    track(() => props.initialTranslations);
    track(() => props.locales.map((l) => l.code).join('|'));
    const parsed = parseSettingsTranslations(props.initialTranslations);
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    for (const [code, row] of Object.entries(parsed)) {
      store[code] = { ...row };
    }
    hiddenJson.value = serializeSettingsTranslations(store);
  });

  return (
    <div class="contents">
      <input type="hidden" name="settings_translations_json" value={hiddenJson.value} />
      <Slot />
    </div>
  );
});

export const SettingsFieldGlobe = component$<{
  /** Top-level translated setting; use `path` for nested ones such as `seo_defaults`. */
  field?: SettingsScalarField;
  path?: string[];
  globeAriaLabel: string;
  fallbackText: string;
  multiline?: boolean;
}>((props) => {
  const ctx = useContext(settingsTranslationsContext);
  const { lang } = useTranslate();
  const expanded = useSignal(false);
  const path = props.path ?? (props.field ? [props.field] : []);
  const active = String(lang || ctx.activeLocale).toLowerCase();
  const otherLocales = ctx.locales.filter((loc) => loc.code.toLowerCase() !== active);

  if (!otherLocales.length || path.length === 0) {
    return <Slot />;
  }

  const hintBase =
    props.fallbackText.trim().length > 72
      ? `${props.fallbackText.trim().slice(0, 72)}…`
      : props.fallbackText.trim();

  return (
    <>
      <div class="relative">
        <div class="[&_input]:pe-11 [&_textarea]:pe-11">
          <Slot />
        </div>
        <button
          type="button"
          class={`absolute end-1.5 z-10 rounded-lg border border-sky-200 bg-sky-50/90 p-1 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/80 ${
            props.multiline ? 'top-2' : 'top-1/2 -translate-y-1/2'
          }`}
          aria-expanded={expanded.value}
          aria-label={props.globeAriaLabel}
          onClick$={() => {
            expanded.value = !expanded.value;
          }}
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10.25" fill="#0284c7" />
            <path
              fill="none"
              stroke="rgba(255,255,255,0.92)"
              stroke-width="1.1"
              d="M2 12h20M12 2c2.5 3.2 4 6.5 4 10s-1.5 6.8-4 10c-2.5-3.2-4-6.5-4-10s1.5-6.8 4-10z"
            />
          </svg>
        </button>
      </div>

      {expanded.value ? (
        <div class="mb-4 mt-2 space-y-3 rounded-lg border border-sky-100 bg-sky-50/40 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
          {otherLocales.map((loc) => (
            <div
              key={loc.code}
              dir={loc.rtl ? 'rtl' : 'ltr'}
              lang={loc.code}
              class="rounded-md border border-gray-100 bg-white/90 p-3 dark:border-gray-800 dark:bg-gray-900/80"
            >
              <div class="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {loc.native_label || loc.label} ({loc.code})
              </div>
              {props.multiline ? (
                <textarea
                  rows={3}
                  value={pathTranslation(ctx.store, loc.code, path)}
                  placeholder={hintBase ? `${hintBase} — ${ctx.fallbackHintShort}` : ctx.fallbackHintShort}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    const next = setPathTranslation(ctx.store, loc.code, path, el.value);
                    Object.assign(ctx.store, next);
                    ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                />
              ) : (
                <input
                  type="text"
                  value={pathTranslation(ctx.store, loc.code, path)}
                  placeholder={hintBase ? `${hintBase} — ${ctx.fallbackHintShort}` : ctx.fallbackHintShort}
                  onInput$={(e) => {
                    const el = e.target as HTMLInputElement;
                    const next = setPathTranslation(ctx.store, loc.code, path, el.value);
                    Object.assign(ctx.store, next);
                    ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
});

/**
 * Main settings input for the dashboard language.
 * Default locale posts the primary field name. Any other dashboard language edits
 * `settings_translations` for that locale and does not overwrite the primary copy.
 * `dir="auto"` keeps English LTR and Arabic RTL inside an RTL dashboard.
 */
export const SettingsLocaleTextField = component$<{
  field?: SettingsScalarField;
  path?: string[];
  name?: string;
  primaryValue: string;
  uiLocale: string;
  defaultLocale: string | undefined;
  multiline?: boolean;
  rows?: number;
  inputClass: string;
  maxLength?: number;
  id?: string;
  placeholder?: string;
  onPrimaryInput$?: QRL<(value: string) => void>;
}>((props) => {
  const ctx = useContext(settingsTranslationsContext);
  const ui = String(props.uiLocale || '').toLowerCase();
  const path = props.path ?? (props.field ? [props.field] : []);
  const secondary =
    path.length > 0 &&
    !dashboardEditsPrimarySettings(ui, props.defaultLocale) &&
    ctx.locales.some((loc) => loc.code.toLowerCase() === ui);
  const value = secondary ? pathTranslation(ctx.store, ui, path) : props.primaryValue;
  const placeholder = secondary ? props.placeholder ?? props.primaryValue : props.placeholder;

  if (!secondary && !props.onPrimaryInput$) {
    return props.multiline ? (
      <textarea
        id={props.id}
        name={props.name}
        rows={props.rows ?? 3}
        dir="auto"
        maxLength={props.maxLength}
        value={props.primaryValue}
        placeholder={props.placeholder}
        class={props.inputClass}
      />
    ) : (
      <input
        id={props.id}
        name={props.name}
        type="text"
        dir="auto"
        maxLength={props.maxLength}
        value={props.primaryValue}
        placeholder={props.placeholder}
        class={props.inputClass}
      />
    );
  }

  if (props.multiline) {
    return (
      <textarea
        id={props.id}
        name={secondary ? undefined : props.name}
        rows={props.rows ?? 3}
        dir="auto"
        lang={secondary ? ui : undefined}
        maxLength={props.maxLength}
        value={value}
        placeholder={placeholder}
        class={props.inputClass}
        onInput$={(e) => {
          const raw = (e.target as HTMLTextAreaElement).value;
          if (secondary) {
            const next = setPathTranslation(ctx.store, ui, path, raw);
            Object.assign(ctx.store, next);
            ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
            return;
          }
          void props.onPrimaryInput$?.(raw);
        }}
      />
    );
  }

  return (
    <input
      id={props.id}
      name={secondary ? undefined : props.name}
      type="text"
      dir="auto"
      lang={secondary ? ui : undefined}
      maxLength={props.maxLength}
      value={value}
      placeholder={placeholder}
      class={props.inputClass}
      onInput$={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        if (secondary) {
          const next = setPathTranslation(ctx.store, ui, path, raw);
          Object.assign(ctx.store, next);
          ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
          return;
        }
        void props.onPrimaryInput$?.(raw);
      }}
    />
  );
});
