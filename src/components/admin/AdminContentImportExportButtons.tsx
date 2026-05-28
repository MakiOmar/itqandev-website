import { component$, useSignal, $, useComputed$, type QRL, type Signal } from '@builder.io/qwik';
import Swal from 'sweetalert2';
import { translateApp } from '../../lib/i18n/useTranslate';
import { uiLangFromUrlPathname } from '../../lib/i18n/ui-locale-path';
import {
  exportContentJson,
  importContentJson,
  type ContentImportMode,
} from '../../lib/admin/content-import-export';

export type AdminContentImportExportProps = {
  lang: string;
  exportEndpoint: string;
  importEndpoint: string;
  filePrefix: string;
  selectedIds: Signal<string[] | Set<string | number>>;
  busy: Signal<boolean>;
  onRefetch$: QRL<(locale: string) => Promise<void>>;
};

function selectionToIds(selected: string[] | Set<string | number>): string[] {
  if (Array.isArray(selected)) {
    return [...selected];
  }
  return Array.from(selected).map((id) => String(id));
}

export const AdminContentImportExportButtons = component$<AdminContentImportExportProps>(
  ({ lang, exportEndpoint, importEndpoint, filePrefix, selectedIds, busy, onRefetch$ }) => {
    const importFileRef = useSignal<HTMLInputElement | undefined>();
    const selectedCount = useComputed$(() => selectionToIds(selectedIds.value).length);

    const getContentLocale = $(() => {
      if (typeof window !== 'undefined') {
        const fromPath = uiLangFromUrlPathname(window.location.pathname);
        if (fromPath) {
          return fromPath;
        }
      }
      return String(lang || 'en').toLowerCase();
    });

    const handleExportAll = $(async () => {
      if (busy.value) {
        return;
      }
      busy.value = true;
      try {
        const loc = await getContentLocale();
        await exportContentJson(exportEndpoint, filePrefix, loc);
        await Swal.fire({
          icon: 'success',
          title: translateApp(lang, 'common.success'),
          text: translateApp(lang, 'contentExport.exportSuccess'),
          confirmButtonColor: '#10b981',
        });
      } catch (err: unknown) {
        await Swal.fire({
          icon: 'error',
          title: translateApp(lang, 'common.error'),
          text: err instanceof Error ? err.message : 'Export failed',
          confirmButtonColor: '#ef4444',
        });
      } finally {
        busy.value = false;
      }
    });

    const handleExportSelected = $(async () => {
      const ids = selectionToIds(selectedIds.value);
      if (busy.value || ids.length === 0) {
        return;
      }
      busy.value = true;
      try {
        const loc = await getContentLocale();
        await exportContentJson(exportEndpoint, filePrefix, loc, ids);
        await Swal.fire({
          icon: 'success',
          title: translateApp(lang, 'common.success'),
          text: translateApp(lang, 'contentExport.exportSuccess'),
          confirmButtonColor: '#10b981',
        });
      } catch (err: unknown) {
        await Swal.fire({
          icon: 'error',
          title: translateApp(lang, 'common.error'),
          text: err instanceof Error ? err.message : 'Export failed',
          confirmButtonColor: '#ef4444',
        });
      } finally {
        busy.value = false;
      }
    });

    const handleImportClick = $(() => {
      importFileRef.value?.click();
    });

    const handleImportFile = $(async (ev: Event) => {
      const input = ev.target as HTMLInputElement;
      const file = input.files?.[0];
      input.value = '';
      if (!file) {
        return;
      }

      const upsertLabel = translateApp(lang, 'contentExport.importModeUpsert');
      const translationLabel = translateApp(lang, 'contentExport.importModeTranslationOnly');

      const modeResult = await Swal.fire({
        title: translateApp(lang, 'contentExport.importTitle'),
        html: `
        <p class="text-sm text-gray-600 mb-3 dark:text-gray-300">${translateApp(lang, 'contentExport.importChooseFile')}</p>
        <p class="text-sm font-medium mb-2">${file.name}</p>
        <label class="flex items-start gap-2 mb-2 text-sm text-left">
          <input type="radio" name="import-mode" value="upsert" checked class="mt-1" />
          <span>${upsertLabel}</span>
        </label>
        <label class="flex items-start gap-2 text-sm text-left">
          <input type="radio" name="import-mode" value="translation_only" class="mt-1" />
          <span>${translationLabel}</span>
        </label>
      `,
        showCancelButton: true,
        confirmButtonText: translateApp(lang, 'contentExport.importConfirm'),
        cancelButtonText: translateApp(lang, 'common.cancel'),
        focusConfirm: false,
        preConfirm: () => {
          const selected = document.querySelector<HTMLInputElement>('input[name="import-mode"]:checked');
          return (selected?.value === 'translation_only' ? 'translation_only' : 'upsert') as ContentImportMode;
        },
      });

      if (!modeResult.isConfirmed || !modeResult.value) {
        return;
      }

      if (busy.value) {
        return;
      }
      busy.value = true;

      try {
        const loc = await getContentLocale();
        const text = await file.text();
        const rawPayload = JSON.parse(text) as unknown;
        const fileLocale =
          rawPayload &&
          typeof rawPayload === 'object' &&
          !Array.isArray(rawPayload) &&
          'locale' in rawPayload
            ? String((rawPayload as { locale?: unknown }).locale ?? '').toLowerCase()
            : '';
        const localeRetargeted = fileLocale !== '' && fileLocale !== loc.toLowerCase();
        const result = await importContentJson(
          importEndpoint,
          loc,
          rawPayload,
          modeResult.value as ContentImportMode,
        );

        let summary = translateApp(lang, 'contentExport.importSuccess', {
          created: String(result.created),
          updated: String(result.updated),
          skipped: String(result.skipped),
        });

        if (localeRetargeted) {
          summary = `${translateApp(lang, 'contentExport.importLocaleRetargeted')} ${summary}`;
        }

        if (result.errors?.length) {
          const details = result.errors
            .slice(0, 3)
            .map((e) => `${e.slug}: ${e.message}`)
            .join('; ');
          summary += ` ${translateApp(lang, 'contentExport.importErrors', { details })}`;
        }

        await Swal.fire({
          icon: 'success',
          title: translateApp(lang, 'common.success'),
          text: summary,
          confirmButtonColor: '#10b981',
        });

        await onRefetch$(loc);
      } catch (err: unknown) {
        await Swal.fire({
          icon: 'error',
          title: translateApp(lang, 'common.error'),
          text: err instanceof Error ? err.message : 'Import failed',
          confirmButtonColor: '#ef4444',
        });
      } finally {
        busy.value = false;
      }
    });

    return (
      <>
        <input
          ref={importFileRef}
          type="file"
          accept="application/json,.json"
          class="hidden"
          onChange$={handleImportFile}
        />

        <button
          type="button"
          disabled={busy.value}
          onClick$={handleExportAll}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'contentExport.exportAll')}
        </button>

        {selectedCount.value > 0 && (
          <button
            type="button"
            disabled={busy.value}
            onClick$={handleExportSelected}
            class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            {translateApp(lang, 'contentExport.exportSelected', { count: String(selectedCount.value) })}
          </button>
        )}

        <button
          type="button"
          disabled={busy.value}
          onClick$={handleImportClick}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'contentExport.import')}
        </button>
      </>
    );
  },
);
