import { component$, type QRL } from '@builder.io/qwik';
import { SvgIcon } from '~/components/marketing/SvgIcon';
import { readSharedRepeaterBag, writeSharedRepeaterText } from '~/lib/admin/appearance-locale-settings';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { AppearanceSettingField } from '~/lib/marketing/appearance-types';

export type SharedRepeaterTranslationsEditorProps = {
  field: AppearanceSettingField;
  label: string;
  values: Record<string, unknown>;
  activeLocale: string;
  defaultLocale: string;
  lang: string;
  onSettingsChange$: QRL<(next: Record<string, unknown>) => void>;
};

/** Secondary-language view of a shared repeater: rows/icons are fixed, only translatable texts are editable. */
export const SharedRepeaterTranslationsEditor = component$<SharedRepeaterTranslationsEditorProps>((props) => {
  const rows = Array.isArray(props.values[props.field.key])
    ? (props.values[props.field.key] as Record<string, unknown>[])
    : [];
  const itemFields = props.field.item_fields ?? [];
  const textFields = itemFields.filter((f) => f.translatable === true);
  const iconField = itemFields.find((f) => f.type === 'icon');
  const bag = readSharedRepeaterBag(props.values, props.field.key, props.activeLocale, props.defaultLocale);

  return (
    <div class="md:col-span-2 space-y-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <span class="text-xs font-medium text-gray-600 dark:text-gray-300">{props.label}</span>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {translateApp(props.lang, 'appearance.sharedRepeaterHint', { locale: props.activeLocale.toUpperCase() })}
      </p>
      {rows.length === 0 ? (
        <p class="text-xs text-gray-400">{translateApp(props.lang, 'appearance.sharedRepeaterEmpty')}</p>
      ) : null}
      {rows.map((row, rowIndex) => {
        const rowId = typeof row.id === 'string' ? row.id : '';
        return (
          <div
            key={rowId || rowIndex}
            class="flex items-start gap-3 rounded border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-slate-950"
          >
            {/* Shared icon preview (edited in the default language) */}
            {iconField ? (
              <span class="mt-5 inline-flex h-8 w-8 shrink-0 items-center justify-center text-gray-700 dark:text-gray-200">
                <SvgIcon value={row[iconField.key]} size={20} />
              </span>
            ) : null}
            <div class="grid min-w-0 flex-1 gap-2">
              {textFields.map((sub) => (
                <div key={sub.key}>
                  <label class="mb-1 block text-[11px] text-gray-500">{sub.label}</label>
                  <input
                    type="text"
                    class="w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm disabled:opacity-60 dark:border-gray-600 dark:bg-slate-900"
                    value={bag[rowId]?.[sub.key] ?? ''}
                    placeholder={typeof row[sub.key] === 'string' ? (row[sub.key] as string) : ''}
                    disabled={!rowId}
                    title={rowId ? undefined : translateApp(props.lang, 'appearance.sharedRepeaterSaveFirst')}
                    onInput$={async (_, el) => {
                      await props.onSettingsChange$(
                        writeSharedRepeaterText(
                          props.values,
                          props.field.key,
                          rowId,
                          sub.key,
                          el.value,
                          props.activeLocale,
                          props.defaultLocale,
                        ),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
});
