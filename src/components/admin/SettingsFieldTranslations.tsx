import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
  useStore,
  useTask$,
  Slot,
  type Signal,
} from '@builder.io/qwik';
import type { SiteLanguageRow } from '../../types/site-language';
import {
  parseSettingsTranslations,
  serializeSettingsTranslations,
  scalarTranslation,
  setScalarTranslation,
  type SettingsScalarField,
  type SettingsTranslationsMap,
} from '../../lib/admin/settings-translations';

interface SettingsTranslationsContextValue {
  locales: SiteLanguageRow[];
  store: SettingsTranslationsMap;
  hiddenJson: Signal<string>;
  rtlBadge: string;
  fallbackHintShort: string;
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
}>((props) => {
  const hiddenJson = useSignal(serializeSettingsTranslations(props.initialTranslations));
  const store = useStore<SettingsTranslationsMap>({});

  useContextProvider(settingsTranslationsContext, {
    locales: props.locales,
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
  field: SettingsScalarField;
  globeAriaLabel: string;
  fallbackText: string;
  multiline?: boolean;
}>((props) => {
  const ctx = useContext(settingsTranslationsContext);
  const expanded = useSignal(false);

  if (!ctx.locales.length) {
    return <Slot />;
  }

  const hintBase =
    props.fallbackText.trim().length > 72
      ? `${props.fallbackText.trim().slice(0, 72)}…`
      : props.fallbackText.trim();

  return (
    <>
      <div class="flex items-end gap-2">
        <div class="min-w-0 flex-1">
          <Slot />
        </div>
        <button
          type="button"
          class="mb-1 shrink-0 rounded-xl border border-sky-200 bg-sky-50/80 p-1 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50"
          aria-expanded={expanded.value}
          aria-label={props.globeAriaLabel}
          onClick$={() => {
            expanded.value = !expanded.value;
          }}
        >
          <svg class="h-9 w-9" viewBox="0 0 24 24" aria-hidden="true">
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
        <div class="mb-4 space-y-3 rounded-lg border border-sky-100 bg-sky-50/40 p-3 dark:border-sky-900/50 dark:bg-sky-950/20">
          {ctx.locales.map((loc) => (
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
                  value={scalarTranslation(ctx.store, loc.code, props.field)}
                  placeholder={hintBase ? `${hintBase} — ${ctx.fallbackHintShort}` : ctx.fallbackHintShort}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    const next = setScalarTranslation(ctx.store, loc.code, props.field, el.value);
                    Object.assign(ctx.store, next);
                    ctx.hiddenJson.value = serializeSettingsTranslations(ctx.store);
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                />
              ) : (
                <input
                  type="text"
                  value={scalarTranslation(ctx.store, loc.code, props.field)}
                  placeholder={hintBase ? `${hintBase} — ${ctx.fallbackHintShort}` : ctx.fallbackHintShort}
                  onInput$={(e) => {
                    const el = e.target as HTMLInputElement;
                    const next = setScalarTranslation(ctx.store, loc.code, props.field, el.value);
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
