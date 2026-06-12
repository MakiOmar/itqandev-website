import { component$, $, useSignal, type QRL } from '@builder.io/qwik';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import type { FontFileFormat, FontFormData } from '~/types/font';
import { FONT_FILE_FORMATS } from '~/types/font';
import { uploadFontFile } from '~/lib/admin/font-api';

interface FontFormFieldsProps {
  form: FontFormData;
  onChange$: QRL<(next: FontFormData) => void>;
}

export const FontFormFields = component$<FontFormFieldsProps>((props) => {
  const { lang } = useTranslate();
  const uploading = useSignal<FontFileFormat | null>(null);

  const setField = $((key: keyof FontFormData, value: string) => {
    props.onChange$({ ...props.form, [key]: value });
  });

  const handleUpload = $(async (format: FontFileFormat, ev: Event) => {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    uploading.value = format;
    try {
      const url = await uploadFontFile(file, format);
      const key = `file_${format}` as keyof FontFormData;
      props.onChange$({ ...props.form, [key]: url });
    } catch (e) {
      console.error('Font upload failed', e);
      alert(translateApp(lang, 'fonts.uploadFailed'));
    } finally {
      uploading.value = null;
      input.value = '';
    }
  });

  const clearFile = $((format: FontFileFormat) => {
    const key = `file_${format}` as keyof FontFormData;
    props.onChange$({ ...props.form, [key]: '' });
  });

  return (
    <div class="space-y-4">
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'fonts.name')}
        </label>
        <input
          type="text"
          value={props.form.name}
          onInput$={(e) => setField('name', (e.target as HTMLInputElement).value)}
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {translateApp(lang, 'fonts.cssFamily')}
        </label>
        <input
          type="text"
          value={props.form.css_family}
          onInput$={(e) => setField('css_family', (e.target as HTMLInputElement).value)}
          placeholder="My Brand Sans"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{translateApp(lang, 'fonts.cssFamilyHint')}</p>
      </div>

      <div>
        <h3 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
          {translateApp(lang, 'fonts.filesHeading')}
        </h3>
        <p class="mb-3 text-xs text-gray-500 dark:text-gray-400">{translateApp(lang, 'fonts.filesHint')}</p>
        <div class="space-y-3">
          {FONT_FILE_FORMATS.map((format) => {
            const key = `file_${format}` as keyof FontFormData;
            const url = String(props.form[key] ?? '').trim();
            return (
              <div
                key={format}
                class="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span class="text-sm font-medium uppercase text-gray-700 dark:text-gray-200">{format}</span>
                  {url ? (
                    <p class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400" title={url}>
                      {url}
                    </p>
                  ) : (
                    <p class="mt-1 text-xs text-gray-400">{translateApp(lang, 'fonts.noFile')}</p>
                  )}
                </div>
                <div class="flex shrink-0 items-center gap-2">
                  <label class="cursor-pointer rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700">
                    {uploading.value === format
                      ? translateApp(lang, 'fonts.uploading')
                      : translateApp(lang, 'fonts.upload')}
                    <input
                      type="file"
                      class="hidden"
                      accept={`.${format}`}
                      disabled={uploading.value !== null}
                      onChange$={(e) => handleUpload(format, e)}
                    />
                  </label>
                  {url ? (
                    <button
                      type="button"
                      class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                      onClick$={() => clearFile(format)}
                    >
                      {translateApp(lang, 'common.clear')}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
