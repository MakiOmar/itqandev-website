import { component$, useSignal, $, type QRL, type Signal } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { AppearanceSettingsFields } from '~/components/admin/appearance/AppearanceSettingsFields';
import {
  createActionFromRegistry,
  createEmptyRow,
  createFieldFromRegistry,
  effectiveFieldSpan,
  ensureFormActions,
  ensureFormLayout,
  ensureFormSettings,
  previewFieldSpanClass,
} from '~/lib/admin/form-layout';
import { translateApp } from '~/lib/i18n/useTranslate';
import {
  ADMIN_NATIVE_OPTION_CLASS,
  ADMIN_NATIVE_SELECT_COMPACT_CLASS,
  ADMIN_PRIMARY_BUTTON_CLASS,
} from '~/lib/admin/native-select-classes';
import type {
  FormActionNode,
  FormActionRegistryEntry,
  FormFieldRegistryEntry,
  FormLayoutDocument,
  FormSettings,
} from '~/types/form';
import type { SiteLanguageRow } from '~/types/site-language';
import { moveItem } from '~/lib/admin/appearance-actions';

type Device = 'mobile' | 'tablet' | 'desktop';
type Selection =
  | { kind: 'field'; rowIndex: number; fieldIndex: number }
  | { kind: 'action'; actionIndex: number }
  | null;

export type FormBuilderWorkspaceProps = {
  lang: string;
  formId: number;
  formTitle: string;
  classicEditHref: string;
  submissionsHref: string;
  layout: Signal<FormLayoutDocument>;
  actions: Signal<FormActionNode[]>;
  settings: Signal<FormSettings>;
  fieldRegistry: Signal<FormFieldRegistryEntry[]>;
  actionRegistry: Signal<FormActionRegistryEntry[]>;
  siteLanguages: SiteLanguageRow[];
  defaultLocale: string;
  activeLocale: Signal<string>;
  saving: Signal<boolean>;
  onSave$: QRL<() => Promise<void>>;
};

export const FormBuilderWorkspace = component$<FormBuilderWorkspaceProps>((props) => {
  const device = useSignal<Device>('desktop');
  const selection = useSignal<Selection>(null);
  const tab = useSignal<'fields' | 'actions' | 'settings'>('fields');

  const commitLayout$ = $(async (next: FormLayoutDocument) => {
    props.layout.value = ensureFormLayout(next);
  });
  const commitActions$ = $(async (next: FormActionNode[]) => {
    props.actions.value = ensureFormActions(next);
  });

  const layout = ensureFormLayout(props.layout.value);
  const actions = ensureFormActions(props.actions.value);
  const settings = ensureFormSettings(props.settings.value);

  const selectedField =
    selection.value?.kind === 'field'
      ? layout.rows[selection.value.rowIndex]?.fields[selection.value.fieldIndex]
      : null;
  const selectedAction =
    selection.value?.kind === 'action' ? actions[selection.value.actionIndex] : null;

  return (
    <div class="flex h-full min-h-0 flex-col">
      <header class="flex flex-shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-white px-4 py-2 dark:border-gray-800 dark:bg-slate-900">
        <Link
          href={props.classicEditHref}
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {translateApp(props.lang, 'forms.exitBuilder')}
        </Link>
        <Link
          href={props.submissionsHref}
          class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {translateApp(props.lang, 'forms.submissions')}
        </Link>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
            {translateApp(props.lang, 'forms.builderTitle')}
            {props.formTitle ? ` — ${props.formTitle}` : ''}
          </p>
          <p class="truncate text-xs text-gray-500 dark:text-gray-400">
            {translateApp(props.lang, 'forms.builderHint')}
          </p>
        </div>
        <div class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600">
          {(['mobile', 'tablet', 'desktop'] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              class={[
                'rounded-md px-2.5 py-1 text-xs font-medium',
                device.value === d
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
              onClick$={() => {
                device.value = d;
              }}
            >
              {translateApp(props.lang, `forms.device.${d}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          class={ADMIN_PRIMARY_BUTTON_CLASS}
          disabled={props.saving.value}
          onClick$={props.onSave$}
        >
          {props.saving.value
            ? translateApp(props.lang, 'common.loading')
            : translateApp(props.lang, 'common.save')}
        </button>
      </header>

      <div class="flex min-h-0 flex-1">
        <aside class="flex w-64 flex-shrink-0 flex-col border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
          <div class="flex border-b border-gray-200 dark:border-gray-800">
            {(['fields', 'actions', 'settings'] as const).map((t) => (
              <button
                key={t}
                type="button"
                class={[
                  'flex-1 px-2 py-2 text-xs font-semibold uppercase',
                  tab.value === t
                    ? 'border-b-2 border-primary-600 text-primary-700 dark:text-primary-300'
                    : 'text-gray-500',
                ].join(' ')}
                onClick$={() => {
                  tab.value = t;
                }}
              >
                {translateApp(props.lang, `forms.tab.${t}`)}
              </button>
            ))}
          </div>
          <div class="space-y-2 overflow-y-auto p-3">
            {tab.value === 'fields'
              ? props.fieldRegistry.value.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-start text-sm font-medium text-gray-800 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-950 dark:border-gray-700 dark:bg-slate-950 dark:text-gray-100 dark:hover:bg-slate-800 dark:hover:text-white"
                    onClick$={async () => {
                      const next = ensureFormLayout(props.layout.value);
                      let row = next.rows[next.rows.length - 1];
                      if (!row) {
                        row = createEmptyRow();
                        next.rows.push(row);
                      }
                      row.fields.push(
                        createFieldFromRegistry(entry.type, entry.default_settings || {}, 12),
                      );
                      await commitLayout$(next);
                      selection.value = {
                        kind: 'field',
                        rowIndex: next.rows.length - 1,
                        fieldIndex: row.fields.length - 1,
                      };
                    }}
                  >
                    {entry.label}
                  </button>
                ))
              : null}

            {tab.value === 'actions' ? (
              <>
                <p class="text-[11px] text-gray-500">{translateApp(props.lang, 'forms.actionsHint')}</p>
                {props.actionRegistry.value.map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    class="w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-start text-sm hover:border-primary-400 dark:border-gray-600"
                    onClick$={async () => {
                      const next = [
                        ...ensureFormActions(props.actions.value),
                        createActionFromRegistry(
                          entry.type,
                          entry.default_settings || {},
                          entry.default_enabled !== false,
                        ),
                      ];
                      await commitActions$(next);
                      selection.value = { kind: 'action', actionIndex: next.length - 1 };
                    }}
                  >
                    + {entry.label}
                  </button>
                ))}
              </>
            ) : null}

            {tab.value === 'settings' ? (
              <p class="text-xs text-gray-500">{translateApp(props.lang, 'forms.settingsHint')}</p>
            ) : null}
          </div>
        </aside>

        <main class="min-w-0 flex-1 overflow-y-auto bg-gray-100 p-4 dark:bg-slate-950">
          {tab.value === 'settings' ? (
            <div class="mx-auto max-w-xl space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-slate-900">
              <label class="block text-xs font-medium">
                {translateApp(props.lang, 'forms.submitLabel')}
                <input
                  class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                  value={settings.submit_label || ''}
                  onInput$={(e) => {
                    props.settings.value = {
                      ...ensureFormSettings(props.settings.value),
                      submit_label: (e.target as HTMLInputElement).value,
                    };
                  }}
                />
              </label>
              <label class="block text-xs font-medium">
                {translateApp(props.lang, 'forms.successMessage')}
                <textarea
                  class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                  rows={3}
                  value={settings.success_message || ''}
                  onInput$={(e) => {
                    props.settings.value = {
                      ...ensureFormSettings(props.settings.value),
                      success_message: (e.target as HTMLTextAreaElement).value,
                    };
                  }}
                />
              </label>
              <label class="block text-xs font-medium">
                {translateApp(props.lang, 'forms.errorMessage')}
                <textarea
                  class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                  rows={2}
                  value={settings.error_message || ''}
                  onInput$={(e) => {
                    props.settings.value = {
                      ...ensureFormSettings(props.settings.value),
                      error_message: (e.target as HTMLTextAreaElement).value,
                    };
                  }}
                />
              </label>
              <label class="block text-xs font-medium">
                {translateApp(props.lang, 'forms.captcha')}
                <select
                  class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} mt-1 w-full`}
                  value={settings.captcha || 'none'}
                  onChange$={(e) => {
                    props.settings.value = {
                      ...ensureFormSettings(props.settings.value),
                      captcha: (e.target as HTMLSelectElement).value as FormSettings['captcha'],
                    };
                  }}
                >
                  {['none', 'turnstile', 'recaptcha_v2', 'recaptcha_v3'].map((v) => (
                    <option key={v} class={ADMIN_NATIVE_OPTION_CLASS} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label class="flex items-center gap-2 text-xs font-medium">
                <input
                  type="checkbox"
                  checked={settings.honeypot !== false}
                  onChange$={(e) => {
                    props.settings.value = {
                      ...ensureFormSettings(props.settings.value),
                      honeypot: (e.target as HTMLInputElement).checked,
                    };
                  }}
                />
                {translateApp(props.lang, 'forms.honeypot')}
              </label>
            </div>
          ) : null}

          {tab.value === 'actions' ? (
            <ul class="mx-auto max-w-2xl space-y-2">
              {actions.map((action, actionIndex) => {
                const entry = props.actionRegistry.value.find((r) => r.type === action.type);
                const selected =
                  selection.value?.kind === 'action' &&
                  selection.value.actionIndex === actionIndex;
                return (
                  <li
                    key={action.id}
                    class={[
                      'flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-900',
                      selected
                        ? 'border-primary-500 ring-1 ring-primary-500/40'
                        : 'border-gray-200 dark:border-gray-700',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      class="min-w-0 flex-1 truncate text-start text-sm font-medium"
                      onClick$={() => {
                        selection.value = { kind: 'action', actionIndex };
                      }}
                    >
                      {entry?.label || action.type}
                    </button>
                    <label class="flex items-center gap-1 text-[11px]">
                      <input
                        type="checkbox"
                        checked={action.enabled}
                        onChange$={async (e) => {
                          const next = ensureFormActions(props.actions.value).map((a, i) =>
                            i === actionIndex
                              ? { ...a, enabled: (e.target as HTMLInputElement).checked }
                              : a,
                          );
                          await commitActions$(next);
                        }}
                      />
                      {translateApp(props.lang, 'forms.enabled')}
                    </label>
                    <button
                      type="button"
                      class="rounded border border-gray-300 px-1.5 text-xs dark:border-gray-600"
                      disabled={actionIndex === 0}
                      onClick$={async () => {
                        if (actionIndex === 0) return;
                        await commitActions$(
                          moveItem(ensureFormActions(props.actions.value), actionIndex, actionIndex - 1),
                        );
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      class="rounded border border-gray-300 px-1.5 text-xs dark:border-gray-600"
                      disabled={actionIndex >= actions.length - 1}
                      onClick$={async () => {
                        if (actionIndex >= actions.length - 1) return;
                        await commitActions$(
                          moveItem(ensureFormActions(props.actions.value), actionIndex, actionIndex + 1),
                        );
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-6 min-w-6 items-center justify-center rounded border border-red-500 bg-red-600 text-xs font-bold text-white"
                      disabled={action.type === 'store_submission'}
                      onClick$={async () => {
                        if (action.type === 'store_submission') return;
                        selection.value = null;
                        await commitActions$(
                          ensureFormActions(props.actions.value).filter((_, i) => i !== actionIndex),
                        );
                      }}
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {tab.value === 'fields' ? (
            <div class="mx-auto space-y-3">
              <button
                type="button"
                class="rounded border border-dashed border-gray-400 px-3 py-1.5 text-xs dark:border-gray-600"
                onClick$={async () => {
                  const next = ensureFormLayout(props.layout.value);
                  next.rows.push(createEmptyRow());
                  await commitLayout$(next);
                }}
              >
                {translateApp(props.lang, 'forms.addRow')}
              </button>
              {layout.rows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  class="rounded-xl border border-dashed border-gray-300 bg-white p-3 dark:border-gray-600 dark:bg-slate-900"
                >
                  <div class="mb-2 flex items-center gap-2">
                    <span class="text-xs font-semibold uppercase text-gray-500">
                      {translateApp(props.lang, 'forms.row')} {rowIndex + 1}
                    </span>
                    <button
                      type="button"
                      class="ms-auto inline-flex h-6 min-w-6 items-center justify-center rounded border border-red-500 bg-red-600 text-xs font-bold text-white"
                      onClick$={async () => {
                        selection.value = null;
                        const next = ensureFormLayout(props.layout.value);
                        next.rows = next.rows.filter((_, i) => i !== rowIndex);
                        await commitLayout$(next);
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div class="grid grid-cols-12 gap-2">
                    {row.fields.map((field, fieldIndex) => {
                      const span = effectiveFieldSpan(field.span, device.value);
                      const entry = props.fieldRegistry.value.find((r) => r.type === field.type);
                      const selected =
                        selection.value?.kind === 'field' &&
                        selection.value.rowIndex === rowIndex &&
                        selection.value.fieldIndex === fieldIndex;
                      return (
                        <div
                          key={field.id}
                          class={[
                            previewFieldSpanClass(span),
                            'rounded-md border p-2',
                            selected
                              ? 'border-primary-500 ring-1 ring-primary-500/40'
                              : 'border-gray-200 dark:border-gray-700',
                          ].join(' ')}
                        >
                          <div class="mb-1 flex items-center gap-1">
                            <button
                              type="button"
                              class="min-w-0 flex-1 truncate text-start text-[11px] font-medium"
                              onClick$={() => {
                                selection.value = { kind: 'field', rowIndex, fieldIndex };
                              }}
                            >
                              {String(field.settings.label || entry?.label || field.type)} · {span}
                              /12
                            </button>
                            <button
                              type="button"
                              class="inline-flex h-6 min-w-6 items-center justify-center rounded border border-gray-400 bg-white text-xs dark:border-gray-500 dark:bg-slate-800 dark:text-white"
                              onClick$={() => {
                                selection.value = { kind: 'field', rowIndex, fieldIndex };
                              }}
                            >
                              ✎
                            </button>
                            <button
                              type="button"
                              class="inline-flex h-6 min-w-6 items-center justify-center rounded border border-red-500 bg-red-600 text-xs font-bold text-white"
                              onClick$={async () => {
                                selection.value = null;
                                const next = ensureFormLayout(props.layout.value);
                                next.rows[rowIndex].fields = next.rows[rowIndex].fields.filter(
                                  (_, i) => i !== fieldIndex,
                                );
                                next.rows = next.rows.filter((r) => r.fields.length > 0);
                                await commitLayout$(next);
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div class="rounded border border-dashed border-gray-300 px-2 py-3 text-center text-[11px] text-gray-400 dark:border-gray-600">
                            {field.type}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </main>

        <aside class="flex w-80 flex-shrink-0 flex-col border-s border-gray-200 bg-white dark:border-gray-800 dark:bg-slate-900">
          <div class="border-b border-gray-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800">
            {translateApp(props.lang, 'forms.inspector')}
          </div>
          <div class="overflow-y-auto p-3">
            {!selectedField && !selectedAction ? (
              <p class="text-xs text-gray-500">{translateApp(props.lang, 'forms.inspectorEmpty')}</p>
            ) : null}

            {selectedField && selection.value?.kind === 'field' ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">
                  {String(selectedField.settings.label || selectedField.type)}
                </p>
                <div>
                  <p class="mb-1 text-xs font-medium">{translateApp(props.lang, 'forms.spanPresets')}</p>
                  <div class="flex flex-wrap gap-1">
                    {([12, 8, 6, 4, 3] as const).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        class="rounded border border-gray-300 px-2 py-1 text-[11px] dark:border-gray-600"
                        onClick$={async () => {
                          const { rowIndex, fieldIndex } = selection.value as {
                            rowIndex: number;
                            fieldIndex: number;
                          };
                          const next = ensureFormLayout(props.layout.value);
                          const field = next.rows[rowIndex]?.fields[fieldIndex];
                          if (!field) return;
                          field.span = { ...field.span, [device.value]: preset };
                          await commitLayout$(next);
                        }}
                      >
                        {preset}/12
                      </button>
                    ))}
                  </div>
                </div>
                {(['mobile', 'tablet', 'desktop'] as Device[]).map((d) => (
                  <label key={d} class="block text-xs font-medium">
                    {translateApp(props.lang, 'forms.span')} (
                    {translateApp(props.lang, `forms.device.${d}`)})
                    <input
                      type="number"
                      min={1}
                      max={12}
                      class="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-slate-950"
                      value={selectedField.span[d]}
                      onInput$={async (e) => {
                        const n = Number((e.target as HTMLInputElement).value);
                        const { rowIndex, fieldIndex } = selection.value as {
                          rowIndex: number;
                          fieldIndex: number;
                        };
                        const next = ensureFormLayout(props.layout.value);
                        const field = next.rows[rowIndex]?.fields[fieldIndex];
                        if (!field) return;
                        field.span = {
                          ...field.span,
                          [d]: Math.min(12, Math.max(1, Math.round(n) || 1)),
                        };
                        await commitLayout$(next);
                      }}
                    />
                  </label>
                ))}
                {(() => {
                  const entry = props.fieldRegistry.value.find((r) => r.type === selectedField.type);
                  if (!(entry?.settings_fields?.length ?? 0)) return null;
                  return (
                    <AppearanceSettingsFields
                      fields={entry!.settings_fields! as any}
                      values={selectedField.settings ?? {}}
                      onSettingsChange$={async (nextSettings) => {
                        const { rowIndex, fieldIndex } = selection.value as {
                          rowIndex: number;
                          fieldIndex: number;
                        };
                        const next = ensureFormLayout(props.layout.value);
                        const field = next.rows[rowIndex]?.fields[fieldIndex];
                        if (!field) return;
                        field.settings = nextSettings;
                        await commitLayout$(next);
                      }}
                      onPickMedia$={$(async () => {})}
                      languages={props.siteLanguages}
                      defaultLocale={props.defaultLocale}
                      activeLocale={props.activeLocale.value}
                      onLocaleChange$={$((code) => {
                        props.activeLocale.value = code;
                      })}
                      mediaPreviewById={{}}
                      onMediaPreview$={$(() => {})}
                    />
                  );
                })()}
              </div>
            ) : null}

            {selectedAction && selection.value?.kind === 'action' ? (
              <div class="space-y-3">
                <p class="text-sm font-medium">{selectedAction.type}</p>
                {(() => {
                  const entry = props.actionRegistry.value.find(
                    (r) => r.type === selectedAction.type,
                  );
                  if (!(entry?.settings_fields?.length ?? 0)) return null;
                  return (
                    <AppearanceSettingsFields
                      fields={entry!.settings_fields! as any}
                      values={selectedAction.settings ?? {}}
                      onSettingsChange$={async (nextSettings) => {
                        const { actionIndex } = selection.value as { actionIndex: number };
                        const next = ensureFormActions(props.actions.value).map((a, i) =>
                          i === actionIndex ? { ...a, settings: nextSettings } : a,
                        );
                        await commitActions$(next);
                      }}
                      onPickMedia$={$(async () => {})}
                      languages={props.siteLanguages}
                      defaultLocale={props.defaultLocale}
                      activeLocale={props.activeLocale.value}
                      onLocaleChange$={$((code) => {
                        props.activeLocale.value = code;
                      })}
                      mediaPreviewById={{}}
                      onMediaPreview$={$(() => {})}
                    />
                  );
                })()}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
});
