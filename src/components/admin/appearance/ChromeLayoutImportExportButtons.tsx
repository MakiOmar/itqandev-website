import { component$, useSignal, $, type QRL, type Signal } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { showToast } from '~/lib/utils/toast';
import {
  downloadChromeLayoutsExportFromBrowser,
  importChromeLayoutsFromBrowser,
  toChromeLayoutsImportEnvelope,
} from '~/lib/admin/chrome-layout-actions';
import type { ChromeLayoutKind } from '~/types/chrome-layout';

const HEADER_BTN =
  'rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700';

export type ChromeLayoutImportExportButtonsProps = {
  lang: string;
  kind: ChromeLayoutKind;
  selectedIds: Signal<number[]>;
  busy: Signal<boolean>;
  onImported$: QRL<() => Promise<void>>;
};

/**
 * Listing header controls for Theme Builder layouts: Export all / Export selected / Import.
 * Import upserts by slug server-side (`POST /appearance/{kind}/import`).
 */
export const ChromeLayoutImportExportButtons = component$<ChromeLayoutImportExportButtonsProps>((props) => {
  const fileRef = useSignal<HTMLInputElement>();
  const { confirm } = useSwal();

  const runExport$ = $(async (ids?: number[]) => {
    if (props.busy.value) return;
    props.busy.value = true;
    try {
      const res = await downloadChromeLayoutsExportFromBrowser(props.kind, 'theme', ids);
      showToast(res.success ? translateApp(props.lang, 'contentExport.exportSuccess') : res.error || translateApp(props.lang, 'common.error'), res.success ? 'success' : 'error');
    } finally {
      props.busy.value = false;
    }
  });

  const onFile$ = $(async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || props.busy.value) return;

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      showToast(translateApp(props.lang, 'builderExport.errors.INVALID_JSON'), 'error');
      return;
    }
    const envelope = toChromeLayoutsImportEnvelope(raw, props.kind, file.name.replace(/\.json$/i, ''));
    if (!envelope) {
      showToast(translateApp(props.lang, 'chromeLayouts.importInvalidFile'), 'error');
      return;
    }

    const answer = await confirm(translateApp(props.lang, 'chromeLayouts.importConfirmText'), {
      title: translateApp(props.lang, 'chromeLayouts.importTitle'),
      icon: 'question',
      confirmText: translateApp(props.lang, 'contentExport.importConfirm'),
    });
    if (!answer.isConfirmed) return;

    props.busy.value = true;
    try {
      const res = await importChromeLayoutsFromBrowser(props.kind, envelope);
      if (!res.success) {
        showToast(res.error || translateApp(props.lang, 'common.error'), 'error');
        return;
      }
      showToast(
        translateApp(props.lang, 'chromeLayouts.importDone', {
          created: String(res.created ?? 0),
          updated: String(res.updated ?? 0),
          skipped: String(res.skipped),
        }),
        res.skipped > 0 ? 'warning' : 'success',
        res.skipped > 0 ? 6000 : 3000,
      );
      await props.onImported$();
    } finally {
      props.busy.value = false;
    }
  });

  return (
    <>
      {/* Hidden picker for the import JSON file */}
      <input ref={fileRef} type="file" accept="application/json,.json" class="hidden" onChange$={onFile$} />
      <button type="button" class={HEADER_BTN} disabled={props.busy.value} onClick$={() => runExport$()}>
        {translateApp(props.lang, 'contentExport.exportAll')}
      </button>
      {props.selectedIds.value.length > 0 ? (
        <button
          type="button"
          class={HEADER_BTN}
          disabled={props.busy.value}
          onClick$={() => runExport$([...props.selectedIds.value])}
        >
          {translateApp(props.lang, 'contentExport.exportSelected', { count: String(props.selectedIds.value.length) })}
        </button>
      ) : null}
      <button type="button" class={HEADER_BTN} disabled={props.busy.value} onClick$={() => fileRef.value?.click()}>
        {translateApp(props.lang, 'contentExport.import')}
      </button>
    </>
  );
});
