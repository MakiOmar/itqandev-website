import { component$, type QRL } from '@builder.io/qwik';
import { AdminSwitch } from './AdminSwitch';
import type { AppearanceSettingField } from '~/lib/marketing/appearance-types';

export type AppearanceSettingsFieldsProps = {
  fields: AppearanceSettingField[];
  values: Record<string, unknown>;
  onFieldChange$: QRL<(key: string, value: unknown) => void>;
  onPickMedia$: QRL<(key: string, accept?: string) => void>;
};

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

/** Renders typed appearance setting fields (text, number, boolean, media, json). */
export const AppearanceSettingsFields = component$<AppearanceSettingsFieldsProps>((props) => {
  return (
    <div class="grid gap-3 md:grid-cols-2">
      {props.fields.map((field) => {
        const raw = props.values?.[field.key];
        if (field.type === 'boolean') {
          const checked = raw === true || raw === 'true' || raw === 1 || raw === '1';
          return (
            <div key={field.key} class="flex items-center md:col-span-2">
              <AdminSwitch
                checked={checked}
                label={field.label}
                onChange$={async (next) => {
                  await props.onFieldChange$(field.key, next);
                }}
              />
            </div>
          );
        }
        if (field.type === 'media') {
          const url = asString(raw);
          return (
            <div key={field.key} class="md:col-span-2">
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
                        await props.onFieldChange$(field.key, '');
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
                      await props.onFieldChange$(field.key, (e.target as HTMLInputElement).value);
                    }}
                  />
                </div>
              </div>
            </div>
          );
        }
        if (field.type === 'textarea') {
          return (
            <div key={field.key} class="md:col-span-2">
              <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                {field.label}
              </label>
              <textarea
                rows={3}
                class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
                value={asString(raw)}
                onInput$={async (e) => {
                  await props.onFieldChange$(field.key, (e.target as HTMLTextAreaElement).value);
                }}
              />
            </div>
          );
        }
        if (field.type === 'number') {
          return (
            <div key={field.key}>
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
                  await props.onFieldChange$(field.key, Number((e.target as HTMLInputElement).value));
                }}
              />
            </div>
          );
        }
        if (field.type === 'json') {
          const text = typeof raw === 'string' ? raw : JSON.stringify(raw ?? [], null, 2);
          return (
            <div key={field.key} class="md:col-span-2">
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
                    const parsed = JSON.parse(next);
                    await props.onFieldChange$(field.key, parsed);
                  } catch {
                    /* ignore invalid JSON while typing */
                  }
                }}
              />
            </div>
          );
        }
        return (
          <div key={field.key}>
            <label class="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
              {field.label}
            </label>
            <input
              type="text"
              class="w-full rounded border px-2 py-1 text-sm dark:bg-gray-900"
              value={asString(raw)}
              onInput$={async (e) => {
                await props.onFieldChange$(field.key, (e.target as HTMLInputElement).value);
              }}
            />
          </div>
        );
      })}
    </div>
  );
});
