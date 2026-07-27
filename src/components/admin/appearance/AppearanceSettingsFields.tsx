import { component$, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from './AdminSwitch';
import {
  isAppearanceFieldTranslatable,
  readAppearanceSettingValue,
  writeAppearanceSettingValue,
} from '~/lib/admin/appearance-locale-settings';
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
  /** True when tabs include UI locales beyond Settings → Languages. */
  usingUiLocaleFallback?: boolean;
};

type FieldControlProps = {
  field: AppearanceSettingField;
  values: Record<string, unknown>;
  activeLocale: string;
  defaultLocale: string;
  onSettingsChange$: QRL<(next: Record<string, unknown>) => void>;
  onPickMedia$: QRL<(key: string, accept?: string) => void>;
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
  const translatable = isAppearanceFieldTranslatable(field);
  const raw = readAppearanceSettingValue(
    props.values,
    field.key,
    props.activeLocale,
    props.defaultLocale,
    translatable,
  );

  if (field.type === 'boolean') {
    const checked = raw === true || raw === 'true' || raw === 1 || raw === '1';
    return (
      <div class="flex items-center md:col-span-2">
        <AdminSwitch
          checked={checked}
          label={field.label}
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
    const url = asString(raw);
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {field.label}
        </label>
        <div class="flex flex-wrap items-start gap-3">
          {url ? (
            <img
              src={url}
              alt=""
              class="h-20 w-auto max-w-[12rem] rounded border border-gray-200 object-cover dark:border-gray-600"
            />
          ) : (
            <div class="flex h-20 w-32 items-center justify-center rounded border border-dashed border-gray-300 text-xs text-gray-400 dark:border-gray-600">
              No image
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
              Select from library
            </button>
            {url ? (
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
                Clear
              </button>
            ) : null}
            <input
              type="text"
              class="w-full min-w-[14rem] rounded border px-2 py-1 text-xs dark:bg-gray-900"
              placeholder="Or paste URL"
              value={url}
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
          {field.label}
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
          {field.label}
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

  if (field.type === 'json') {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? [], null, 2);
    return (
      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
          {field.label}
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
        {field.label}
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
          <p class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Language
          </p>
          <div
            class="flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900/60"
            role="tablist"
            aria-label="Section language"
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
                    <span class="ml-1 text-[10px] font-normal uppercase text-gray-400">default</span>
                  ) : null}
                </button>
              );
            })}
          </div>
          {props.usingUiLocaleFallback ? (
            <p class="mt-2 text-xs text-amber-700 dark:text-amber-300/90">
              Settings currently has one content language. Tabs include UI locales so you can draft
              translations anyway.
              {props.languagesSettingsHref ? (
                <>
                  {' '}
                  <a
                    href={props.languagesSettingsHref}
                    class="font-medium underline hover:no-underline"
                  >
                    Add languages in Settings
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
          {activeLocale !== defaultLocale ? (
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Editing {activeLocale.toUpperCase()} copy. Empty fields fall back to the default
              language on the public site. Layout, media, and limits stay shared.
            </p>
          ) : null}
        </div>
      ) : (
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Only one language is available.
          {props.languagesSettingsHref ? (
            <>
              {' '}
              <a
                href={props.languagesSettingsHref}
                class="font-medium text-primary-600 underline hover:no-underline"
              >
                Add another in Settings → Languages
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
              onSettingsChange$={props.onSettingsChange$}
              onPickMedia$={props.onPickMedia$}
            />
          ))}
        </div>
      ) : null}

      {sharedFields.length > 0 ? (
        <div class="space-y-2">
          {showTabs && localizedFields.length > 0 ? (
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Shared settings
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
                onSettingsChange$={props.onSettingsChange$}
                onPickMedia$={props.onPickMedia$}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
});
