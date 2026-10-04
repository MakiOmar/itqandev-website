import { $, component$, useSignal, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from './AdminSwitch';
import { FormSlugSelectField } from './FormSlugSelectField';
import { CategoryMultiSelectField } from './CategoryMultiSelectField';
import { ResponsiveColumnsField } from './ResponsiveColumnsField';
import { HeroFloatingIconsEditor } from './HeroFloatingIconsEditor';
import { IconPickerField } from './IconPickerField';
import {
  isAppearanceFieldTranslatable,
  isSharedRepeaterField,
  newRepeaterRowId,
  readAppearanceSettingValue,
  writeAppearanceSettingValue,
} from '~/lib/admin/appearance-locale-settings';
import {
  groupAppearanceFields,
  hasAppearanceFieldGroups,
  isAppearanceFieldVisible,
  isAppearanceSettingOn,
} from '~/lib/admin/appearance-field-groups';
import { SharedRepeaterTranslationsEditor } from './SharedRepeaterTranslationsEditor';
import { ColorPickerField } from '~/components/admin/ColorPickerField';
import { appearanceMediaPreviewSrc, appearanceMediaUrlInputValue } from '~/lib/admin/appearance-media-ref';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { appearanceFieldLabel } from '~/lib/i18n/appearance-labels';
import type { AppearanceSettingField } from '~/lib/marketing/appearance-types';
import { normalizeResponsiveColumns } from '~/lib/marketing/grid-columns';
import type { SiteLanguageRow } from '~/types/site-language';
import type { CategorySelectOption } from './CategoryMultiSelectField';
import { BuilderDynamicTagButton, type BuilderDynamicTag } from './BuilderDynamicTagButton';
import {
  INSPECTOR_INPUT,
  INSPECTOR_LABEL,
  INSPECTOR_ROW,
  INSPECTOR_STACK,
  INSPECTOR_STACK_LABEL,
} from './inspector-classes';
import { MediaPreviewPanel } from './MediaPreviewPanel';
import { TrashGlyph } from './InspectorGlyphs';
import { LinkModeControl } from './LinkModeControl';
import {
  LINK_MODE_KEYS,
  hasLinkModeFields,
  isFoldedLinkModeField,
  isTruthySetting,
} from '~/lib/admin/link-mode-fields';

export type AppearanceSettingsFieldsProps = {
  fields: AppearanceSettingField[];
  values: Record<string, unknown>;
  onSettingsChange$: QRL<(next: Record<string, unknown>) => void>;
  onPickMedia$: QRL<(key: string, accept?: string) => void>;
  languages?: SiteLanguageRow[];
  defaultLocale?: string;
  activeLocale?: string;
  onLocaleChange$?: QRL<(code: string) => void>;
  /** Optional admin link when site has only one configured content language. */
  languagesSettingsHref?: string;
  /** Resolved preview URLs keyed by media id string (for id-valued media fields). */
  mediaPreviewById?: Record<string, string>;
  /** When a nested editor picks media, cache the preview URL by id. */
  onMediaPreview$?: QRL<(mediaId: number, url: string) => void>;
  /** Prefill category checkboxes (page builder preview / public categories). */
  categoryOptions?: CategorySelectOption[];
  /** Allowlisted dynamic tags for text/URL fields (theme / loop documents). */
  dynamicTags?: BuilderDynamicTag[];
};

type FieldControlProps = {
  field: AppearanceSettingField;
  values: Record<string, unknown>;
  activeLocale: string;
  defaultLocale: string;
  onSettingsChange$: QRL<(next: Record<string, unknown>) => void>;
  onPickMedia$: QRL<(key: string, accept?: string) => void>;
  mediaPreviewById?: Record<string, string>;
  onMediaPreview$?: QRL<(mediaId: number, url: string) => void>;
  lang: string;
  categoryOptions?: CategorySelectOption[];
  dynamicTags?: BuilderDynamicTag[];
  /** Fields include link URL + new tab + lightbox: show them as one Link control. */
  linkMode?: boolean;
};

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function localeLabel(row: SiteLanguageRow): string {
  return row.native_label || row.label || row.code;
}

const AppearanceSettingFieldControl = component$<FieldControlProps>((props) => {
  const field = props.field;
  const label = appearanceFieldLabel(props.lang, field.key, field.label);
  const translatable = isAppearanceFieldTranslatable(field);
  const raw = readAppearanceSettingValue(
    props.values,
    field.key,
    props.activeLocale,
    props.defaultLocale,
    translatable,
  );
  const write$ = $(async (next: unknown) => {
    await props.onSettingsChange$(
      writeAppearanceSettingValue(props.values, field.key, next, props.activeLocale, props.defaultLocale, translatable),
    );
  });
  const insertTag$ = $(async (token: string) => {
    const current = asString(
      readAppearanceSettingValue(props.values, field.key, props.activeLocale, props.defaultLocale, translatable),
    );
    await write$(`${current}${token}`);
  });
  const tags = props.dynamicTags ?? [];

  if (props.linkMode && field.key === LINK_MODE_KEYS.url) {
    const shared = (key: string) =>
      readAppearanceSettingValue(props.values, key, props.activeLocale, props.defaultLocale, false);
    return (
      <LinkModeControl
        lang={props.lang}
        url={asString(raw)}
        newTab={isTruthySetting(shared(LINK_MODE_KEYS.newTab))}
        lightbox={isTruthySetting(shared(LINK_MODE_KEYS.lightbox))}
        tags={tags}
        onPatch$={async (patch) => {
          let next = props.values;
          for (const [key, value] of Object.entries(patch)) {
            next = writeAppearanceSettingValue(next, key, value, props.activeLocale, props.defaultLocale, false);
          }
          await props.onSettingsChange$(next);
        }}
      />
    );
  }

  if (field.type === 'floating_icons') {
    return (
      <div>
        <label class={INSPECTOR_STACK_LABEL}>
          {label}
        </label>
        <HeroFloatingIconsEditor
          lang={props.lang}
          icons={raw}
          mediaPreviewById={props.mediaPreviewById}
          onChange$={async (icons) => {
            await props.onSettingsChange$(
              writeAppearanceSettingValue(
                props.values,
                field.key,
                icons,
                props.activeLocale,
                props.defaultLocale,
                false,
              ),
            );
          }}
          onPreviewUrl$={props.onMediaPreview$}
        />
      </div>
    );
  }

  if (field.type === 'form') {
    return (
      <FormSlugSelectField
        lang={props.lang}
        label={label}
        value={asString(raw)}
        onChange$={async (slug) => {
          await props.onSettingsChange$(
            writeAppearanceSettingValue(
              props.values,
              field.key,
              slug,
              props.activeLocale,
              props.defaultLocale,
              translatable,
            ),
          );
        }}
      />
    );
  }

  if (field.type === 'category_multi') {
    const ids = Array.isArray(raw)
      ? (raw as unknown[]).map((v) => Number(v)).filter((n) => Number.isFinite(n) && n > 0)
      : [];
    return (
      <CategoryMultiSelectField
        lang={props.lang}
        label={label}
        value={ids}
        initialOptions={props.categoryOptions}
        onChange$={async (nextIds) => {
          await props.onSettingsChange$(
            writeAppearanceSettingValue(
              props.values,
              field.key,
              nextIds,
              props.activeLocale,
              props.defaultLocale,
              false,
            ),
          );
        }}
      />
    );
  }

  if (field.type === 'responsive_columns') {
    return (
      <ResponsiveColumnsField
        lang={props.lang}
        label={label}
        value={normalizeResponsiveColumns(raw)}
        onChange$={async (columns) => {
          await props.onSettingsChange$(
            writeAppearanceSettingValue(
              props.values,
              field.key,
              columns,
              props.activeLocale,
              props.defaultLocale,
              false,
            ),
          );
        }}
      />
    );
  }

  if (field.type === 'select') {
    const options = field.options ?? [];
    // Unsaved/unknown values show the first option, which renderers treat as the default.
    const current = options.some((opt) => opt.value === asString(raw)) ? asString(raw) : (options[0]?.value ?? '');
    const selectId = `setting-${field.key}`;
    return (
      <div class={INSPECTOR_ROW}>
        <label for={selectId} class={INSPECTOR_LABEL}>{label}</label>
        <select
          id={selectId}
          class={INSPECTOR_INPUT}
          value={current}
          onChange$={async (e) => {
            await write$((e.target as HTMLSelectElement).value);
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} selected={opt.value === current}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'url' || field.type === 'video' || field.type === 'link') {
    const inputId = `setting-${field.key}`;
    return (
      <div class={INSPECTOR_ROW}>
        <label for={inputId} class={INSPECTOR_LABEL}>{label}</label>
        {/* URL input with the dynamic-tag trigger inside its end edge */}
        <div class="relative">
          <input
            id={inputId}
            type="url"
            class={[INSPECTOR_INPUT, tags.length ? 'pe-8' : ''].join(' ')}
            value={asString(raw)}
            dir="ltr"
            placeholder={field.type === 'video' ? 'https://youtube.com/…' : translateApp(props.lang, 'appearance.urlPlaceholder')}
            onInput$={async (e) => {
              await write$((e.target as HTMLInputElement).value);
            }}
          />
          <BuilderDynamicTagButton tags={tags} lang={props.lang} onInsert$={insertTag$} />
        </div>
      </div>
    );
  }

  if (field.type === 'icon') {
    return (
      <IconPickerField
        label={label}
        value={raw}
        lang={props.lang}
        onChange$={async (next) => {
          await props.onSettingsChange$(
            writeAppearanceSettingValue(
              props.values,
              field.key,
              next,
              props.activeLocale,
              props.defaultLocale,
              translatable,
            ),
          );
        }}
      />
    );
  }

  if (field.type === 'richtext') {
    return (
      <div>
        <label class={INSPECTOR_STACK_LABEL}>{label}</label>
        <div class="relative">
          <textarea
            class={[
              'min-h-[8rem] w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 font-mono text-sm dark:border-gray-600 dark:bg-slate-900',
              tags.length ? 'pe-8' : '',
            ].join(' ')}
            value={asString(raw)}
            onInput$={async (e) => {
              await write$((e.target as HTMLTextAreaElement).value);
            }}
          />
          <BuilderDynamicTagButton tags={tags} lang={props.lang} onInsert$={insertTag$} top />
        </div>
        <p class="mt-1 text-[11px] text-gray-500">{translateApp(props.lang, 'appearance.htmlAllowed')}</p>
      </div>
    );
  }

  if (field.type === 'repeater') {
    const sharedRows = isSharedRepeaterField(field);
    if (sharedRows && props.activeLocale.toLowerCase() !== props.defaultLocale.toLowerCase()) {
      return (
        <SharedRepeaterTranslationsEditor
          field={field}
          label={label}
          values={props.values}
          activeLocale={props.activeLocale}
          defaultLocale={props.defaultLocale}
          lang={props.lang}
          onSettingsChange$={props.onSettingsChange$}
        />
      );
    }
    const rows = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    const itemFields = field.item_fields ?? [];
    const setRows$ = $(async (next: Record<string, unknown>[]) => {
      await write$(next);
    });
    return (
      <div class="space-y-2 rounded-lg border border-gray-200 p-2.5 dark:border-gray-700">
        {/* Repeater header: label + add row */}
        <div class="flex items-center justify-between">
          <span class={INSPECTOR_LABEL}>{label}</span>
          <button
            type="button"
            class="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-slate-800"
            onClick$={async () => {
              const blank: Record<string, unknown> = sharedRows ? { id: newRepeaterRowId() } : {};
              for (const f of itemFields) blank[f.key] = f.type === 'boolean' ? false : f.type === 'number' ? 0 : f.type === 'repeater' ? [] : '';
              await setRows$([...rows, blank]);
            }}
          >
            {translateApp(props.lang, 'appearance.repeaterAdd')}
          </button>
        </div>
        {rows.map((row, rowIndex) => {
          const setSub$ = $(async (key: string, value: unknown) => {
            await setRows$(rows.map((r, i) => (i === rowIndex ? { ...r, [key]: value } : r)));
          });
          return (
            <div
              key={rowIndex}
              class="space-y-2.5 rounded-md border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-slate-950"
            >
              {/* Row toolbar: position + remove */}
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-medium text-gray-400">#{rowIndex + 1}</span>
                <button
                  type="button"
                  class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  title={translateApp(props.lang, 'appearance.repeaterRemove')}
                  aria-label={translateApp(props.lang, 'appearance.repeaterRemove')}
                  onClick$={async () => {
                    await setRows$(rows.filter((_, i) => i !== rowIndex));
                  }}
                >
                  <TrashGlyph />
                </button>
              </div>
              <div class={INSPECTOR_STACK}>
                {itemFields.map((sub) => {
                  const subVal = row[sub.key];
                  const subId = `setting-${field.key}-${rowIndex}-${sub.key}`;
                  if (sub.type === 'boolean') {
                    const checked = subVal === true || subVal === 'true' || subVal === 1 || subVal === '1';
                    return (
                      <div key={sub.key} class={INSPECTOR_ROW}>
                        <span class={INSPECTOR_LABEL}>{sub.label}</span>
                        <div class="flex justify-end">
                          <AdminSwitch checked={checked} ariaLabel={sub.label} onChange$={(next) => setSub$(sub.key, next)} />
                        </div>
                      </div>
                    );
                  }
                  if (sub.type === 'icon') {
                    return (
                      <IconPickerField
                        key={sub.key}
                        label={sub.label}
                        value={subVal}
                        lang={props.lang}
                        onChange$={(next) => setSub$(sub.key, next)}
                      />
                    );
                  }
                  if (sub.type === 'media') {
                    return (
                      <MediaPreviewPanel
                        key={sub.key}
                        label={sub.label}
                        lang={props.lang}
                        value={subVal}
                        previewSrc={appearanceMediaPreviewSrc(subVal, props.mediaPreviewById)}
                        onPick$={() => props.onPickMedia$(`${field.key}.${rowIndex}.${sub.key}`, sub.accept)}
                        onClear$={() => setSub$(sub.key, '')}
                        compact
                      />
                    );
                  }
                  if (sub.type === 'textarea') {
                    return (
                      <div key={sub.key}>
                        <label for={subId} class={INSPECTOR_STACK_LABEL}>{sub.label}</label>
                        <textarea
                          id={subId}
                          rows={3}
                          class={INSPECTOR_INPUT}
                          value={asString(subVal)}
                          onInput$={(e) => setSub$(sub.key, (e.target as HTMLTextAreaElement).value)}
                        />
                      </div>
                    );
                  }
                  if (sub.type === 'select') {
                    return (
                      <div key={sub.key} class={INSPECTOR_ROW}>
                        <label for={subId} class={INSPECTOR_LABEL}>{sub.label}</label>
                        <select
                          id={subId}
                          class={INSPECTOR_INPUT}
                          value={asString(subVal)}
                          onChange$={(e) => setSub$(sub.key, (e.target as HTMLSelectElement).value)}
                        >
                          {(sub.options ?? []).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }
                  const isUrl = sub.type === 'url' || sub.type === 'video' || sub.type === 'link';
                  return (
                    <div key={sub.key} class={INSPECTOR_ROW}>
                      <label for={subId} class={INSPECTOR_LABEL}>{sub.label}</label>
                      <input
                        id={subId}
                        type={sub.type === 'number' ? 'number' : isUrl ? 'url' : 'text'}
                        dir={isUrl ? 'ltr' : undefined}
                        class={INSPECTOR_INPUT}
                        value={asString(subVal)}
                        onInput$={(e) => {
                          const value = (e.target as HTMLInputElement).value;
                          return setSub$(sub.key, sub.type === 'number' ? Number(value) : value);
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (field.type === 'boolean') {
    const checked = raw === true || raw === 'true' || raw === 1 || raw === '1';
    return (
      <div class={INSPECTOR_ROW}>
        <span class={INSPECTOR_LABEL}>{label}</span>
        <div class="flex justify-end">
          <AdminSwitch checked={checked} ariaLabel={label} onChange$={write$} />
        </div>
      </div>
    );
  }

  if (field.type === 'media') {
    return (
      <MediaPreviewPanel
        label={label}
        lang={props.lang}
        value={raw}
        previewSrc={appearanceMediaPreviewSrc(raw, props.mediaPreviewById)}
        onPick$={() => props.onPickMedia$(field.key, field.accept)}
        onClear$={() => write$('')}
        urlValue={appearanceMediaUrlInputValue(raw)}
        onUrlInput$={write$}
      />
    );
  }

  if (field.type === 'textarea') {
    const inputId = `setting-${field.key}`;
    return (
      <div>
        <label for={inputId} class={INSPECTOR_STACK_LABEL}>{label}</label>
        <div class="relative">
          <textarea
            id={inputId}
            rows={3}
            class={[INSPECTOR_INPUT, tags.length ? 'pe-8' : ''].join(' ')}
            value={asString(raw)}
            onInput$={async (e) => {
              await write$((e.target as HTMLTextAreaElement).value);
            }}
          />
          <BuilderDynamicTagButton tags={tags} lang={props.lang} onInsert$={insertTag$} top />
        </div>
      </div>
    );
  }

  if (field.type === 'number' && field.slider) {
    const min = field.min ?? 0;
    const max = field.max ?? 100;
    const value = Number(raw ?? field.default ?? min);
    const inputId = `setting-${field.key}`;
    return (
      <div>
        <div class="mb-1 flex items-center justify-between gap-2">
          <label for={inputId} class={INSPECTOR_LABEL}>
            {label}
          </label>
          <input
            type="number"
            min={min}
            max={max}
            aria-label={label}
            class="w-16 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 text-end text-xs dark:border-gray-600 dark:bg-slate-900"
            value={value}
            onInput$={async (e) => {
              await write$(Number((e.target as HTMLInputElement).value));
            }}
          />
        </div>
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={1}
          class="w-full accent-primary-600"
          value={value}
          onInput$={async (e) => {
            await write$(Number((e.target as HTMLInputElement).value));
          }}
        />
      </div>
    );
  }

  if (field.type === 'number') {
    const inputId = `setting-${field.key}`;
    return (
      <div class={INSPECTOR_ROW}>
        <label for={inputId} class={INSPECTOR_LABEL}>
          {label}
        </label>
        <input
          id={inputId}
          type="number"
          min={field.min ?? 1}
          max={field.max ?? 24}
          class={INSPECTOR_INPUT}
          value={Number(raw ?? field.default ?? field.min ?? 1)}
          onInput$={async (e) => {
            await write$(Number((e.target as HTMLInputElement).value));
          }}
        />
      </div>
    );
  }

  if (field.type === 'color') {
    const hex = typeof raw === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(raw.trim())
      ? raw.trim().toLowerCase()
      : '';
    const pickerValue = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex || '#0389a1';
    return (
      <div class={INSPECTOR_ROW}>
        <span class={INSPECTOR_LABEL}>{label}</span>
        {/* Swatch + hex input; clear sits inside the row */}
        <div class="flex min-w-0 items-center gap-1.5">
          <ColorPickerField
            value={hex}
            fallback={pickerValue}
            alpha={false}
            lang={props.lang}
            label={label}
            onChange$={write$}
          />
          <input
            type="text"
            placeholder="#0389a1"
            aria-label={label}
            dir="ltr"
            class={INSPECTOR_INPUT}
            value={hex}
            onInput$={async (e) => {
              await write$((e.target as HTMLInputElement).value);
            }}
          />
          {hex ? (
            <button
              type="button"
              class="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-800"
              title={translateApp(props.lang, 'appearance.clear')}
              aria-label={translateApp(props.lang, 'appearance.clear')}
              onClick$={() => write$('')}
            >
              <TrashGlyph />
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === 'json') {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? [], null, 2);
    const inputId = `setting-${field.key}`;
    return (
      <div>
        <label for={inputId} class={INSPECTOR_STACK_LABEL}>
          {label}
        </label>
        <textarea
          id={inputId}
          rows={6}
          class={`${INSPECTOR_INPUT} font-mono text-xs`}
          value={text}
          onInput$={async (e) => {
            const next = (e.target as HTMLTextAreaElement).value;
            try {
              await write$(JSON.parse(next));
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
        />
      </div>
    );
  }

  const inputId = `setting-${field.key}`;
  return (
    <div class={INSPECTOR_ROW}>
      <label for={inputId} class={INSPECTOR_LABEL}>
        {label}
      </label>
      {/* Text input with the dynamic-tag trigger inside its end edge */}
      <div class="relative">
        <input
          id={inputId}
          type="text"
          class={[INSPECTOR_INPUT, tags.length ? 'pe-8' : ''].join(' ')}
          value={asString(raw)}
          onInput$={async (e) => {
            await write$((e.target as HTMLInputElement).value);
          }}
        />
        <BuilderDynamicTagButton tags={tags} lang={props.lang} onInsert$={insertTag$} />
      </div>
    </div>
  );
});

/** Typed appearance fields with optional language tabs for translatable text. */
export const AppearanceSettingsFields = component$<AppearanceSettingsFieldsProps>((props) => {
  const { lang } = useTranslate();
  const languages = props.languages ?? [];
  const defaultLocale = (props.defaultLocale || 'en').toLowerCase();
  const activeLocale = (props.activeLocale || defaultLocale).toLowerCase();
  const showTabs = languages.length > 1;

  const linkMode = hasLinkModeFields(props.fields);
  const sharedFields = props.fields
    .filter((f) => !isAppearanceFieldTranslatable(f) && !isFoldedLinkModeField(f, linkMode))
    // Card style first, then the category picker, so neither is buried under long lists.
    .slice()
    .sort((a, b) => {
      const rank = (f: AppearanceSettingField) =>
        f.key === 'card_style' ? -1 : f.type === 'category_multi' ? 0 : f.type === 'responsive_columns' ? 2 : 1;
      return rank(a) - rank(b);
    });
  const localizedFields = props.fields.filter(
    (f) => isAppearanceFieldTranslatable(f) && !isFoldedLinkModeField(f, linkMode),
  );
  const grouped = hasAppearanceFieldGroups(props.fields);
  const groups = grouped ? groupAppearanceFields(props.fields) : [];
  const groupIds = groups.map((g) => g.id);
  const openGroupId = useSignal<string | null>(null);
  // '' means the user collapsed every section; an unknown id (another block selected) falls back to the first.
  const activeGroupId =
    openGroupId.value === ''
      ? null
      : groups.some((g) => g.id === openGroupId.value)
        ? openGroupId.value
        : (groups[0]?.id ?? null);

  const renderControl = (field: AppearanceSettingField) => {
    const translatable = isAppearanceFieldTranslatable(field);
    return (
      <AppearanceSettingFieldControl
        key={translatable ? `loc-${field.key}-${activeLocale}` : `shared-${field.key}`}
        field={field}
        values={props.values}
        activeLocale={activeLocale}
        defaultLocale={defaultLocale}
        lang={lang}
        categoryOptions={translatable ? undefined : props.categoryOptions}
        onSettingsChange$={props.onSettingsChange$}
        onPickMedia$={props.onPickMedia$}
        mediaPreviewById={props.mediaPreviewById}
        onMediaPreview$={props.onMediaPreview$}
        dynamicTags={props.dynamicTags}
        linkMode={linkMode}
      />
    );
  };

  return (
    <div class="space-y-4">
      {showTabs ? (
        <div>
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 text-start">
            {translateApp(lang, 'appearance.language')}
          </p>
          <div
            class="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/60"
            role="tablist"
            aria-label={translateApp(lang, 'appearance.language')}
          >
            {languages.map((row) => {
              const code = String(row.code || '').toLowerCase();
              const active = code === activeLocale;
              return (
                <button
                  key={code}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  class={[
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white text-primary-700 shadow-sm dark:bg-gray-800 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-800/80',
                  ].join(' ')}
                  onClick$={async () => {
                    if (props.onLocaleChange$) {
                      await props.onLocaleChange$(code);
                    }
                  }}
                >
                  {localeLabel(row)}
                  {code === defaultLocale ? (
                    <span class="ms-1 text-[10px] font-normal uppercase text-gray-400">default</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {activeLocale !== defaultLocale ? (
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400 text-start">
              {translateApp(lang, 'appearance.editingLocaleCopy', {
                locale: activeLocale.toUpperCase(),
              })}
            </p>
          ) : null}
        </div>
      ) : (
        <p class="text-xs text-gray-500 dark:text-gray-400 text-start">
          {translateApp(lang, 'appearance.singleLanguageHint')}
          {props.languagesSettingsHref ? (
            <>
              {' '}
              <a
                href={props.languagesSettingsHref}
                class="font-medium text-primary-600 underline hover:no-underline"
              >
                {translateApp(lang, 'appearance.addLanguageLink')}
              </a>
            </>
          ) : null}
        </p>
      )}

      {grouped ? (
        <div class="space-y-2">
          {groups.map((group) => {
            const groupId = group.id;
            const open = groupId === activeGroupId;
            const toggle = group.fields.find(
              (f) => f.type === 'boolean' && group.fields.some((dep) => dep.show_if === f.key),
            );
            const toggleOff = toggle ? !isAppearanceSettingOn(props.values, toggle.key) : false;
            const visibleFields = group.fields.filter(
              (f) => isAppearanceFieldVisible(f, props.fields, props.values) && !isFoldedLinkModeField(f, linkMode),
            );
            const titleKey = `appearance.groups.${group.id}`;
            const translatedTitle = translateApp(lang, titleKey);
            const fallbackTitle = group.id.replace(/_/g, ' ');
            const title =
              translatedTitle !== titleKey
                ? translatedTitle
                : fallbackTitle.charAt(0).toUpperCase() + fallbackTitle.slice(1);
            const panelId = `settings-group-${group.id}`;
            return (
              /* Single-open accordion section per field group. */
              <section
                key={group.id}
                class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <button
                  type="button"
                  class={[
                    'flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm font-medium',
                    open
                      ? 'bg-gray-50 text-gray-900 dark:bg-gray-800/70 dark:text-gray-100'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/50',
                  ].join(' ')}
                  aria-expanded={open ? 'true' : 'false'}
                  aria-controls={panelId}
                  onClick$={() => {
                    const current = openGroupId.value;
                    const currentOpen =
                      current === '' ? null : current && groupIds.includes(current) ? current : groupIds[0];
                    openGroupId.value = currentOpen === groupId ? '' : groupId;
                  }}
                >
                  <span>{title}</span>
                  <span class="flex items-center gap-2">
                    {toggleOff ? (
                      <span class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {translateApp(lang, 'appearance.off')}
                      </span>
                    ) : null}
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                      class={['h-4 w-4 text-gray-400 transition-transform', open ? 'rotate-180' : ''].join(' ')}
                    >
                      <path
                        fill-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </span>
                </button>
                {open ? (
                  <div id={panelId} class="flex flex-col gap-3 border-t border-gray-200 p-3 dark:border-gray-700">
                    {visibleFields.map((field) => renderControl(field))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {!grouped && localizedFields.length > 0 ? (
        <div class={INSPECTOR_STACK}>
          {localizedFields.map((field) => (
            <AppearanceSettingFieldControl
              key={`loc-${field.key}-${activeLocale}`}
              field={field}
              values={props.values}
              activeLocale={activeLocale}
              defaultLocale={defaultLocale}
              lang={lang}
              onSettingsChange$={props.onSettingsChange$}
              onPickMedia$={props.onPickMedia$}
              mediaPreviewById={props.mediaPreviewById}
              onMediaPreview$={props.onMediaPreview$}
              dynamicTags={props.dynamicTags}
              linkMode={linkMode}
            />
          ))}
        </div>
      ) : null}

      {!grouped && sharedFields.length > 0 ? (
        <div class="space-y-2">
          {showTabs && localizedFields.length > 0 ? (
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 text-start">
              {translateApp(lang, 'appearance.sharedSettings')}
            </p>
          ) : null}
          <div class={INSPECTOR_STACK}>
            {sharedFields.map((field) => (
              <AppearanceSettingFieldControl
                key={`shared-${field.key}`}
                field={field}
                values={props.values}
                activeLocale={activeLocale}
                defaultLocale={defaultLocale}
                lang={lang}
                categoryOptions={props.categoryOptions}
                onSettingsChange$={props.onSettingsChange$}
                onPickMedia$={props.onPickMedia$}
                mediaPreviewById={props.mediaPreviewById}
                onMediaPreview$={props.onMediaPreview$}
                dynamicTags={props.dynamicTags}
                linkMode={linkMode}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
