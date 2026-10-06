import { $, useSignal, type QRL, type Signal } from '@builder.io/qwik';
import { useSwal } from '~/lib/hooks/useSwal';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError, showSuccess } from '~/lib/utils/toast';
import { ensurePageLayoutBands } from './page-layout';
import type { LayoutTreePath } from './page-layout-tree';
import { insertBuilderTemplate, templateContentAt, type BuilderTemplateRow } from './builder-templates';
import {
  migrateLegacySavedBandsFromBrowser,
  runBuilderTemplateContentFromBrowser,
  runBuilderTemplateCreateFromBrowser,
  runBuilderTemplateDeleteFromBrowser,
  runBuilderTemplatesListFromBrowser,
} from './builder-template-actions';
import type { PageLayoutBand, PageSectionNode } from '../marketing/appearance-types';

type Options = {
  lang: string;
  sections: Signal<PageSectionNode[]>;
  /** Path of the selected node, where inserts go (null: append in a new band). */
  selectedPath$: QRL<() => LayoutTreePath | null>;
  commitInserted$: QRL<(bands: PageLayoutBand[], path: LayoutTreePath) => void>;
};

/** Lists, saves, inserts and deletes saved templates for one builder workspace. */
export function useBuilderTemplates(opts: Options) {
  const { lang, sections, selectedPath$, commitInserted$ } = opts;
  const templates = useSignal<BuilderTemplateRow[]>([]);
  const loading = useSignal(false);
  const busyId = useSignal<number | null>(null);
  const { confirm } = useSwal({
    yes: translateApp(lang, 'common.save'),
    no: translateApp(lang, 'common.cancel'),
  });

  // Templates are shared by every builder, so the list reloads each time the tab opens.
  const loadTemplates$ = $(async () => {
    loading.value = true;
    try {
      const moved = await migrateLegacySavedBandsFromBrowser();
      if (moved > 0) showSuccess(translateApp(lang, 'pages.templatesMigrated', { count: moved }));
      const res = await runBuilderTemplatesListFromBrowser();
      if (res.ok) templates.value = res.data;
      else showError(res.message);
    } finally {
      loading.value = false;
    }
  });

  const saveAsTemplate$ = $(async (path: LayoutTreePath, label: string) => {
    const content = templateContentAt(ensurePageLayoutBands(sections.value), path);
    if (!content) return;
    const answer = await confirm(translateApp(lang, 'pages.templateNameHint'), {
      title: translateApp(lang, 'pages.ctxSaveTemplate'),
      icon: 'info',
      input: 'text',
      inputValue: label,
      inputAttributes: { maxlength: '120' },
      inputValidator: (value: string) =>
        value.trim() === '' ? translateApp(lang, 'pages.templateNameRequired') : undefined,
    });
    if (!answer.isConfirmed) return;
    const res = await runBuilderTemplateCreateFromBrowser(String(answer.value ?? '').trim(), content);
    if (!res.ok) {
      showError(res.message);
      return;
    }
    templates.value = [...templates.value, res.data].sort((a, b) => a.name.localeCompare(b.name));
    showSuccess(translateApp(lang, 'pages.templateSaved'));
  });

  const insertTemplate$ = $(async (id: number) => {
    if (busyId.value !== null) return;
    busyId.value = id;
    try {
      const res = await runBuilderTemplateContentFromBrowser(id);
      if (!res.ok) {
        showError(res.message);
        return;
      }
      const inserted = insertBuilderTemplate(ensurePageLayoutBands(sections.value), await selectedPath$(), res.data);
      await commitInserted$(inserted.bands, inserted.path);
    } finally {
      busyId.value = null;
    }
  });

  const deleteTemplate$ = $(async (row: BuilderTemplateRow) => {
    const answer = await confirm(translateApp(lang, 'pages.templateDeleteConfirm', { name: row.name }), {
      title: translateApp(lang, 'common.delete'),
      icon: 'warning',
      confirmText: translateApp(lang, 'common.delete'),
      confirmButtonColor: '#dc2626',
    });
    if (!answer.isConfirmed) return;
    const res = await runBuilderTemplateDeleteFromBrowser(row.id);
    if (!res.ok) {
      showError(res.message);
      return;
    }
    templates.value = templates.value.filter((r) => r.id !== row.id);
    showSuccess(translateApp(lang, 'pages.templateDeleted'));
  });

  return { templates, loading, busyId, loadTemplates$, saveAsTemplate$, insertTemplate$, deleteTemplate$ };
}
