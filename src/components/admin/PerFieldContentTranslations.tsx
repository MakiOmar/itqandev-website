import {
  component$,
  createContextId,
  useContext,
  useContextProvider,
  useSignal,
  useStore,
  useTask$,
  useVisibleTask$,
  Slot,
  type QRL,
  type Signal,
} from '@builder.io/qwik';
import type { SiteLanguageRow } from '../../types/site-language';
import {
  serializeTranslationsJson,
  translationRowsFromJsonString,
} from '../../lib/content-translations';
import { directionForSiteLocale, langAttributeForLocale } from '../../lib/i18n/editing-locale-direction';
import { readPreferredLocaleFromBrowser } from '../../lib/i18n/preferred-locale-persist';

type TranslationKind = 'project' | 'blog';

export type FieldTranslationKey = 'title' | 'summary' | 'description' | 'excerpt' | 'content';

interface TranslationsFormContextValue {
  kind: TranslationKind;
  locales: SiteLanguageRow[];
  /** Server/API baseline JSON (one row per secondary locale) for merge on open */
  initialJson: string;
  store: Record<string, Record<string, string>>;
  hiddenJson: Signal<string>;
  rtlBadge: string;
  fallbackHintShort: string;
}

export const translationsFormContext = createContextId<TranslationsFormContextValue>(
  'admin.content-translations-form',
);

function emptyRow(kind: TranslationKind, merged: Record<string, string> | undefined): Record<string, string> {
  if (kind === 'project') {
    return {
      title: merged?.title != null ? String(merged.title) : '',
      summary: merged?.summary != null ? String(merged.summary) : '',
      description: merged?.description != null ? String(merged.description) : '',
    };
  }
  return {
    title: merged?.title != null ? String(merged.title) : '',
    excerpt: merged?.excerpt != null ? String(merged.excerpt) : '',
    content: merged?.content != null ? String(merged.content) : '',
  };
}

function shortPlaceholder(s: string, max = 72): string {
  const t = s.trim();
  if (!t) {
    return '';
  }
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function mergeTranslationMapsIntoStore(
  kind: TranslationKind,
  locales: SiteLanguageRow[],
  store: Record<string, Record<string, string>>,
  baseline: Map<string, Record<string, string>>,
  current: Map<string, Record<string, string>>,
): void {
  for (const l of locales) {
    const low = l.code.toLowerCase();
    const merged = current.get(low) || baseline.get(low);
    store[l.code] = emptyRow(kind, merged);
  }
}

/**
 * Hidden translations_json + context for per-field globe editors.
 */
export const TranslationsFormRoot = component$<{
  kind: TranslationKind;
  locales: SiteLanguageRow[];
  initialJson: string;
  hiddenFieldName?: string;
  rtlBadge: string;
  fallbackHintShort: string;
}>((props) => {
  const hiddenJson = useSignal(props.initialJson);
  const store = useStore<Record<string, Record<string, string>>>({});

  useContextProvider(translationsFormContext, {
    kind: props.kind,
    locales: props.locales,
    initialJson: props.initialJson,
    store,
    hiddenJson,
    rtlBadge: props.rtlBadge,
    fallbackHintShort: props.fallbackHintShort,
  });

  // useTask$ (not useVisibleTask$) so the store is filled before paint / when the globe opens;
  // otherwise conditional inputs mount with an empty store and never show saved translations.
  useTask$(({ track }) => {
    track(() => props.kind);
    track(() => props.initialJson);
    track(() => props.locales.map((l) => l.code).join('|'));

    const baseline = translationRowsFromJsonString(props.initialJson);
    const current = translationRowsFromJsonString(hiddenJson.value);

    mergeTranslationMapsIntoStore(props.kind, props.locales, store, baseline, current);

    hiddenJson.value = serializeTranslationsJson(props.kind, props.locales, store);
  });

  return (
    <div class="contents">
      {/* translations payload for the API */}
      <input type="hidden" name={props.hiddenFieldName ?? 'translations_json'} value={hiddenJson.value} />
      <Slot />
    </div>
  );
});

function GlobeIcon({ gradId }: { gradId: string }) {
  return (
    <svg class="h-9 w-9 drop-shadow-sm" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#0284c7" />
          <stop offset="45%" style="stop-color:#16a34a" />
          <stop offset="100%" style="stop-color:#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.25" fill={`url(#${gradId})`} />
      <path
        fill="none"
        stroke="rgba(255,255,255,0.92)"
        stroke-width="1.1"
        d="M2 12h20M12 2c2.5 3.2 4 6.5 4 10s-1.5 6.8-4 10c-2.5-3.2-4-6.5-4-10s1.5-6.8 4-10z M4.5 7c4 1.2 11 1.2 15 0M4.5 17c4-1.2 11-1.2 15 0"
      />
    </svg>
  );
}

/**
 * Wraps one main field: optional globe opens per-locale inputs; empty translation falls back to primary at read time.
 */
export const FieldTranslationGlobe = component$<{
  fieldKey: FieldTranslationKey;
  globeAriaLabel: string;
  /** Primary-language value used as placeholder hint for secondary fields */
  fallbackText: string;
  secondaryTextareaRows?: number;
  /** One grid column (e.g. title beside slug) or full row width */
  gridSpan?: 'one' | 'full';
}>((props) => {
  const ctx = useContext(translationsFormContext);
  const expanded = useSignal(false);
  const gradId = `globe-grad-${props.fieldKey}`;
  const rowSpan = props.gridSpan === 'full' ? 'md:col-span-2' : 'md:col-span-1';

  if (!ctx.locales.length) {
    return <Slot />;
  }

  const hintBase = shortPlaceholder(props.fallbackText);
  const hintSuffix = ctx.fallbackHintShort;

  return (
    <>
      <div class={`flex items-end gap-2 ${rowSpan}`}>
        <div class="min-w-0 flex-1">
          <Slot />
        </div>
        <button
          type="button"
          class="mb-1 shrink-0 rounded-xl border border-sky-200 bg-sky-50/80 p-1 shadow-sm transition hover:border-sky-400 hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/50 dark:hover:border-sky-600 dark:hover:bg-sky-900/60"
          aria-expanded={expanded.value}
          aria-label={props.globeAriaLabel}
          onClick$={() => {
            const opening = !expanded.value;
            if (opening) {
              const baseline = translationRowsFromJsonString(ctx.initialJson);
              const current = translationRowsFromJsonString(ctx.hiddenJson.value);
              mergeTranslationMapsIntoStore(ctx.kind, ctx.locales, ctx.store, baseline, current);
              ctx.hiddenJson.value = serializeTranslationsJson(ctx.kind, ctx.locales, ctx.store);
            }
            expanded.value = !expanded.value;
          }}
        >
          <GlobeIcon gradId={gradId} />
        </button>
      </div>

      {expanded.value ? (
        <div class="mt-1 space-y-4 rounded-lg border border-sky-100 bg-sky-50/40 p-3 dark:border-sky-900/50 dark:bg-sky-950/20 md:col-span-2">
          {ctx.locales.map((loc) => (
            <div
              key={loc.code}
              dir={loc.rtl ? 'rtl' : 'ltr'}
              lang={loc.code}
              class="rounded-md border border-gray-100 bg-white/90 p-3 dark:border-gray-800 dark:bg-gray-900/80"
            >
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {loc.native_label || loc.label} ({loc.code})
                </span>
                {loc.rtl ? (
                  <span class="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                    {ctx.rtlBadge}
                  </span>
                ) : null}
              </div>
              {props.fieldKey === 'title' ? (
                <input
                  type="text"
                  value={ctx.store[loc.code]?.[props.fieldKey] ?? ''}
                  placeholder={hintBase ? `${hintBase} — ${hintSuffix}` : hintSuffix}
                  onInput$={(e) => {
                    const el = e.target as HTMLInputElement;
                    if (!ctx.store[loc.code]) {
                      ctx.store[loc.code] = {};
                    }
                    ctx.store[loc.code][props.fieldKey] = el.value;
                    ctx.hiddenJson.value = serializeTranslationsJson(ctx.kind, ctx.locales, ctx.store);
                  }}
                  dir={loc.rtl ? 'rtl' : 'ltr'}
                  lang={loc.code}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                />
              ) : (
                <textarea
                  rows={props.secondaryTextareaRows ?? (props.fieldKey === 'content' ? 8 : props.fieldKey === 'description' ? 4 : 2)}
                  value={ctx.store[loc.code]?.[props.fieldKey] ?? ''}
                  placeholder={hintBase ? `${hintBase} — ${hintSuffix}` : hintSuffix}
                  onInput$={(e) => {
                    const el = e.target as HTMLTextAreaElement;
                    if (!ctx.store[loc.code]) {
                      ctx.store[loc.code] = {};
                    }
                    ctx.store[loc.code][props.fieldKey] = el.value;
                    ctx.hiddenJson.value = serializeTranslationsJson(ctx.kind, ctx.locales, ctx.store);
                  }}
                  dir={loc.rtl ? 'rtl' : 'ltr'}
                  lang={loc.code}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
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
 * Primary language for this record (main columns); empty = site default from settings.
 */
export const ContentPrimaryLanguageSelect = component$<{
  siteLanguages: SiteLanguageRow[];
  defaultLocale: string;
  value: string;
  label: string;
  hint: string;
  useSiteDefaultLabel: string;
  onChange$?: QRL<(code: string) => void>;
}>((props) => {
  return (
    <div class="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <label for="content_locale" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
        {props.label}
      </label>
      <select
        id="content_locale"
        name="content_locale"
        class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
        value={props.value}
        onChange$={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          props.onChange$?.(v);
        }}
      >
        <option value="">{`${props.useSiteDefaultLabel} (${props.defaultLocale})`}</option>
        {props.siteLanguages.map((l) => (
          <option key={l.code} value={l.code}>{`${l.native_label || l.label} (${l.code})`}</option>
        ))}
      </select>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">{props.hint}</p>
    </div>
  );
});

/**
 * Editing language for the current form session.
 * When it matches effective primary locale, main columns are edited; otherwise translation rows are edited.
 */
/**
 * Wrap translatable fields; sets dir/lang from editing locale (RTL Arabic etc.).
 * Use variant `gridContents` inside md:grid-cols-* forms so children stay grid items.
 */
export const EditingLocaleFieldsShell = component$<{
  siteLanguages: SiteLanguageRow[];
  editingLocale: Signal<string>;
  /** stack: vertical spacing; gridContents: display contents for nested CSS grids */
  variant?: 'stack' | 'gridContents';
}>((props) => {
  const dir = directionForSiteLocale(props.siteLanguages, props.editingLocale.value);
  const lang = langAttributeForLocale(props.editingLocale.value);
  const cls = props.variant === 'gridContents' ? 'contents' : 'space-y-4';
  return (
    <div dir={dir} lang={lang} class={cls}>
      <Slot />
    </div>
  );
});

export const ContentEditingLanguageSelect = component$<{
  siteLanguages: SiteLanguageRow[];
  value: string;
  label: string;
  hintPrimary: string;
  hintSecondary: string;
  secondarySavePrefix: string;
  effectivePrimaryLocale: string;
  onChange$?: QRL<(code: string) => void>;
}>((props) => {
  // Navbar persists `preferred-locale` before reload; SSR/loader can seed `en` and `site_languages`
  // may resolve a tick later — track languages and sync once `ar` (etc.) exists in the list.
  const editingLocaleAutoSyncDone = useSignal(false);
  /** Mirrors props.value so the native select element stays in sync after hydration and prop updates. */
  const selectModel = useSignal(String(props.value ?? '').trim());

  useTask$(({ track }) => {
    track(() => props.value);
    const next = String(props.value ?? '').trim();
    if (selectModel.value === next) {
      return;
    }
    selectModel.value = next;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.siteLanguages);
    const prefRaw = readPreferredLocaleFromBrowser();
    const curRaw = String(props.value ?? '').trim();
    if (!props.onChange$ || editingLocaleAutoSyncDone.value) {
      return;
    }
    const pref = prefRaw;
    if (!pref) {
      return;
    }
    const list = props.siteLanguages;
    if (!list.some((l) => String(l.code).toLowerCase() === pref)) {
      return;
    }
    const cur = curRaw.toLowerCase();
    if (cur === pref) {
      editingLocaleAutoSyncDone.value = true;
      return;
    }
    props.onChange$(pref);
    editingLocaleAutoSyncDone.value = true;
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.value);
    track(() => selectModel.value);
    track(() => props.siteLanguages.map((l) => l.code).join('|'));
    const wantRaw = String(props.value ?? '').trim();
    const matchRow = props.siteLanguages.find((l) => String(l.code).toLowerCase() === wantRaw.toLowerCase());
    const want = matchRow ? String(matchRow.code) : wantRaw;
    const el = typeof document !== 'undefined' ? (document.getElementById('editing_locale') as HTMLSelectElement | null) : null;
    const dupIds = typeof document !== 'undefined' ? document.querySelectorAll('#editing_locale').length : 0;
    if (!el || dupIds !== 1 || !want) {
      return;
    }
    if (el.value !== want) {
      el.value = want;
      if (selectModel.value !== want) {
        selectModel.value = want;
      }
    }
  });

  const isPrimary = props.value.toLowerCase() === props.effectivePrimaryLocale.toLowerCase();
  return (
    <div class="md:col-span-2 rounded-lg border border-sky-100 bg-sky-50/60 p-4 dark:border-sky-900/40 dark:bg-sky-950/20">
      <label for="editing_locale" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
        {props.label}
      </label>
      <select
        key={selectModel.value}
        id="editing_locale"
        name="editing_locale"
        class="w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
        value={selectModel.value}
        onChange$={(e) => {
          const v = (e.target as HTMLSelectElement).value;
          selectModel.value = v;
          props.onChange$?.(v);
        }}
      >
        {props.siteLanguages.map((l) => (
          <option key={l.code} value={l.code}>{`${l.native_label || l.label} (${l.code})`}</option>
        ))}
      </select>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {isPrimary ? props.hintPrimary : `${props.secondarySavePrefix} (${props.value}) — ${props.hintSecondary}`}
      </p>
    </div>
  );
});
