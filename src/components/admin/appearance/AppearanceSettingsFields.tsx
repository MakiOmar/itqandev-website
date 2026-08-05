import { component$, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from './AdminSwitch';
import { FormSlugSelectField } from './FormSlugSelectField';
import { HeroFloatingIconsEditor } from './HeroFloatingIconsEditor';
import {
  isAppearanceFieldTranslatable,
  readAppearanceSettingValue,
  writeAppearanceSettingValue,
} from '~/lib/admin/appearance-locale-settings';
import {
  appearanceMediaId,
  appearanceMediaPreviewSrc,
  appearanceMediaUrlInputValue,
} from '~/lib/admin/appearance-media-ref';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { appearanceFieldLabel } from '~/lib/i18n/appearance-labels';
import type { AppearanceSettingField } from '~/lib/marketing/appearance-types';
import type { SiteLanguageRow } from '~/types/site-language';

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

  if (field.type === 'floating_icons') {
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300 text-start">
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

  if (field.type === 'boolean') {
    const checked = raw === true || raw === 'true' || raw === 1 || raw === '1';
    return (
      <div class="flex items-center md:col-span-2">
        <AdminSwitch
          checked={checked}
          label={label}
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
      </div>
    );
  }

  if (field.type === 'media') {
    const preview = appearanceMediaPreviewSrc(raw, props.mediaPreviewById);
    const previewSrc = preview ? resolveLaravelMediaUrl(preview) || preview : '';
    const mediaId = appearanceMediaId(raw);
    const urlInput = appearanceMediaUrlInputValue(raw);
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <div class="flex flex-wrap items-start gap-3">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt=""
              class="h-20 w-auto max-w-[12rem] rounded border border-gray-200 object-cover dark:border-gray-600"
            />
          ) : mediaId !== null ? (
            <div class="flex h-20 w-32 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
              #{mediaId}
            </div>
          ) : (
            <div class="flex h-20 w-32 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
              {translateApp(props.lang, 'appearance.noImage')}
            </div>
          )}
          <div class="flex flex-col gap-2">
            <button
              type="button"
              class="rounded-lg bg-primary-600 px-3 py-2 text-xs font-medium text-white hover:bg-primary-700"
              onClick$={async () => {
                await props.onPickMedia$(field.key, field.accept);
              }}
            >
              {translateApp(props.lang, 'appearance.selectFromLibrary')}
            </button>
            {raw !== undefined && raw !== null && raw !== '' ? (
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-3 py-2 text-xs dark:border-gray-600"
                onClick$={async () => {
                  await props.onSettingsChange$(
                    writeAppearanceSettingValue(
                      props.values,
                      field.key,
                      '',
                      props.activeLocale,
                      props.defaultLocale,
                      translatable,
                    ),
                  );
                }}
              >
                {translateApp(props.lang, 'appearance.clear')}
              </button>
            ) : null}
            <input
              type="url"
              class="w-full min-w-[14rem] rounded border px-2 py-1 text-xs dark:bg-gray-900"
              placeholder={translateApp(props.lang, 'appearance.orPasteUrl')}
              value={urlInput}
              onInput$={async (e) => {
                await props.onSettingsChange$(
                  writeAppearanceSettingValue(
                    props.values,
                    field.key,
                    (e.target as HTMLInputElement).value,
                    props.activeLocale,
                    props.defaultLocale,
                    translatable,
                  ),
                );
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <textarea
          rows={3}
          class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
          value={asString(raw)}
          onInput$={async (e) => {
            await props.onSettingsChange$(
              writeAppearanceSettingValue(
                props.values,
                field.key,
                (e.target as HTMLTextAreaElement).value,
                props.activeLocale,
                props.defaultLocale,
                translatable,
              ),
            );
          }}
        />
      </div>
    );
  }

  if (field.type === 'number') {
    return (
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <input
          type="number"
          min={field.min ?? 1}
          max={field.max ?? 24}
          class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
          value={Number(raw ?? field.min ?? 1)}
          onInput$={async (e) => {
            await props.onSettingsChange$(
              writeAppearanceSettingValue(
                props.values,
                field.key,
                Number((e.target as HTMLInputElement).value),
                props.activeLocale,
                props.defaultLocale,
                translatable,
              ),
            );
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
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300 text-start">
          {label}
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <input
            type="color"
            class="h-9 w-12 cursor-pointer rounded border border-gray-300 bg-white p-0.5 dark:border-gray-600 dark:bg-gray-900"
            value={pickerValue}
            onInput$={async (e) => {
              await props.onSettingsChange$(
                writeAppearanceSettingValue(
                  props.values,
                  field.key,
                  (e.target as HTMLInputElement).value,
                  props.activeLocale,
                  props.defaultLocale,
                  false,
                ),
              );
            }}
          />
          <input
            type="text"
            placeholder="#0389a1"
            class="min-w-[8rem] flex-1 rounded border px-2 py-1.5 text-sm dark:bg-gray-900"
            value={hex}
            onInput$={async (e) => {
              await props.onSettingsChange$(
                writeAppearanceSettingValue(
                  props.values,
                  field.key,
                  (e.target as HTMLInputElement).value,
                  props.activeLocale,
                  props.defaultLocale,
                  false,
                ),
              );
            }}
          />
          {hex ? (
            <button
              type="button"
              class="rounded border border-gray-300 px-2.5 py-1.5 text-xs dark:border-gray-600"
              onClick$={async () => {
                await props.onSettingsChange$(
                  writeAppearanceSettingValue(
                    props.values,
                    field.key,
                    '',
                    props.activeLocale,
                    props.defaultLocale,
                    false,
                  ),
                );
              }}
            >
              {translateApp(props.lang, 'appearance.clear')}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (field.type === 'json') {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? [], null, 2);
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {label}
        </label>
        <textarea
          rows={6}
          class="w-full rounded border px-2 py-1 font-mono text-xs dark:bg-gray-900"
          value={text}
          onInput$={async (e) => {
            const next = (e.target as HTMLTextAreaElement).value;
            try {
              await props.onSettingsChange$(
                writeAppearanceSettingValue(
                  props.values,
                  field.key,
                  JSON.parse(next),
                  props.activeLocale,
                  props.defaultLocale,
                  translatable,
                ),
              );
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
        {label}
      </label>
      <input
        type="text"
        class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
        value={asString(raw)}
        onInput$={async (e) => {
          await props.onSettingsChange$(
            writeAppearanceSettingValue(
              props.values,
              field.key,
              (e.target as HTMLInputElement).value,
              props.activeLocale,
              props.defaultLocale,
              translatable,
            ),
          );
        }}
      />
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

  const sharedFields = props.fields.filter((f) => !isAppearanceFieldTranslatable(f));
  const localizedFields = props.fields.filter((f) => isAppearanceFieldTranslatable(f));

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

      {localizedFields.length > 0 ? (
        <div class="grid gap-3 md:grid-cols-2">
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
            />
          ))}
        </div>
      ) : null}

      {sharedFields.length > 0 ? (
        <div class="space-y-2">
          {showTabs && localizedFields.length > 0 ? (
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 text-start">
              {translateApp(lang, 'appearance.sharedSettings')}
            </p>
          ) : null}
          <div class="grid gap-3 md:grid-cols-2">
            {sharedFields.map((field) => (
              <AppearanceSettingFieldControl
                key={`shared-${field.key}`}
                field={field}
                values={props.values}
                activeLocale={activeLocale}
                defaultLocale={defaultLocale}
                lang={lang}
                onSettingsChange$={props.onSettingsChange$}
                onPickMedia$={props.onPickMedia$}
                mediaPreviewById={props.mediaPreviewById}
                onMediaPreview$={props.onMediaPreview$}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
