import { component$, $, type QRL } from '@builder.io/qwik';
import {
  BuilderImportError,
  downloadBuilderExport,
  parseBuilderExportJson,
  type BuilderKind,
} from '~/lib/admin/builder-import-export';
import { useSwal } from '~/lib/hooks/useSwal';
import { translateApp } from '~/lib/i18n/useTranslate';

const SECONDARY_BTN =
  'rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800';

export type BuilderImportExportButtonsProps = {
  lang: string;
  builder: BuilderKind;
  /** Used in the downloaded filename, e.g. page slug or form title. */
  filenameBase: string;
  disabled?: boolean;
  /** Snapshot the current in-editor document for this builder kind. */
  getDocument$: QRL<() => unknown>;
  /** Replace in-editor state; caller persists with Save. */
  applyDocument$: QRL<(document: unknown) => void | Promise<void>>;
};

function importErrorMessage(lang: string, err: unknown): string {
  const code = err instanceof BuilderImportError ? err.code : 'INVALID_SHAPE';
  const key = `builderExport.errors.${code}`;
  const translated = translateApp(lang, key);
  return translated === key ? translateApp(lang, 'builderExport.errors.INVALID_SHAPE') : translated;
}

/**
 * Shared Import / Export controls for page, form, homepage, and footer builders.
 * Export downloads JSON; Import replaces editor state only (user must Save).
 */
export const BuilderImportExportButtons = component$<BuilderImportExportButtonsProps>((props) => {
  const { confirm, success, error: showError } = useSwal();

  const onExport$ = $(async () => {
    const snapshot = await props.getDocument$();
    downloadBuilderExport(props.builder, snapshot, props.filenameBase);
  });

  const onImportPick$ = $((event: Event) => {
    const host = (event.currentTarget as HTMLElement | null)?.closest('[data-builder-ie]');
    const input = host?.querySelector('input[type="file"]') as HTMLInputElement | null;
    input?.click();
  });

  const onFileChange$ = $(async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    let document: unknown;
    try {
      const text = await file.text();
      document = parseBuilderExportJson(text, props.builder);
    } catch (err) {
      await showError(translateApp(props.lang, 'common.error'), {
        text: importErrorMessage(props.lang, err),
      });
      return;
    }

    const result = await confirm(translateApp(props.lang, 'builderExport.importConfirmText'), {
      title: translateApp(props.lang, 'builderExport.importTitle'),
      icon: 'warning',
      confirmText: translateApp(props.lang, 'builderExport.import'),
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await props.applyDocument$(document);
      await success(translateApp(props.lang, 'common.success'), {
        text: translateApp(props.lang, 'builderExport.importApplied'),
      });
    } catch (err) {
      await showError(translateApp(props.lang, 'common.error'), {
        text: importErrorMessage(props.lang, err),
      });
    }
  });

  return (
    <div class="inline-flex flex-wrap items-center gap-2" data-builder-ie>
      <button
        type="button"
        class={SECONDARY_BTN}
        disabled={props.disabled}
        onClick$={onExport$}
      >
        {translateApp(props.lang, 'builderExport.export')}
      </button>
      <button
        type="button"
        class={SECONDARY_BTN}
        disabled={props.disabled}
        onClick$={onImportPick$}
      >
        {translateApp(props.lang, 'builderExport.import')}
      </button>
      <input
        type="file"
        accept="application/json,.json"
        class="hidden"
        onChange$={onFileChange$}
      />
    </div>
  );
});
