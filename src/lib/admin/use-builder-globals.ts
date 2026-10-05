import { $, useSignal, useVisibleTask$, type QRL, type Signal } from '@builder.io/qwik';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { useSwal } from '~/lib/hooks/useSwal';
import { translateApp } from '~/lib/i18n/useTranslate';
import { showError, showSuccess } from '~/lib/utils/toast';
import { ensurePageLayoutBands } from './page-layout';
import { layoutTreeNodeAt, type LayoutTreePath } from './page-layout-tree';
import {
  canSaveAsGlobal,
  changedGlobalDocuments,
  globalDocumentFromBlock,
  isResolvedGlobalPlacement,
  linkBlockToGlobal,
  linkedGlobalIds,
  resolveGlobalPlacements,
  unlinkGlobalBlock,
  updateBlockAtPath,
  type GlobalWidgetDocument,
  type GlobalWidgetMap,
} from './builder-globals';
import type {
  AppearanceRegistryEntry,
  PageLayoutBand,
  PageLayoutBlock,
  PageSectionNode,
} from '../marketing/appearance-types';

type GlobalRow = { id?: number; name?: string; document?: GlobalWidgetDocument };

type Options = {
  lang: string;
  sections: Signal<PageSectionNode[]>;
  /** JSON of the last saved sections; kept in step when resolving globals is the only change. */
  savedSnapshot: Signal<string>;
  registry: Signal<AppearanceRegistryEntry[]>;
  commit$: QRL<(next: PageLayoutBand[]) => void>;
  /** Called after a new global is created so the palette's Globals tab lists it. */
  onCreated$: QRL<(id: number, name: string) => void>;
};

/** Loads, links, unlinks and saves global widgets for one builder workspace. */
export function useBuilderGlobals(opts: Options) {
  const { lang, sections, savedSnapshot, registry, commit$, onCreated$ } = opts;
  const globals = useSignal<GlobalWidgetMap>({});
  const requested = useSignal<number[]>([]);
  const { confirm } = useSwal({
    yes: translateApp(lang, 'common.save'),
    no: translateApp(lang, 'common.cancel'),
  });

  // Fetch content for globals placed on the canvas, then copy it onto their placements.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const current = ensurePageLayoutBands(track(() => sections.value));
    const tried = new Set(requested.value);
    const missing = linkedGlobalIds(current).filter((id) => !tried.has(id));
    if (missing.length > 0) {
      requested.value = [...requested.value, ...missing];
      const loaded: GlobalWidgetMap = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const res = await getApiClient(null).get<GlobalRow>(`${API_ENDPOINTS.APPEARANCE.GLOBALS}/${id}`);
            const row = res.data;
            if (row?.document?.type) loaded[String(id)] = { name: String(row.name || id), document: row.document };
          } catch (err) {
            console.error('Builder global widget load failed', id, err);
          }
        }),
      );
      if (Object.keys(loaded).length > 0) globals.value = { ...globals.value, ...loaded };
    }
    const latest = ensurePageLayoutBands(sections.value);
    const resolved = resolveGlobalPlacements(latest, globals.value);
    if (!resolved) return;
    const wasClean = JSON.stringify(sections.value) === savedSnapshot.value;
    sections.value = resolved;
    if (wasClean) savedSnapshot.value = JSON.stringify(resolved);
  });

  const saveAsGlobal$ = $(async (path: LayoutTreePath, label: string) => {
    const current = ensurePageLayoutBands(sections.value);
    if (!canSaveAsGlobal(current, path)) return;
    const block = layoutTreeNodeAt(current, path) as PageLayoutBlock;
    const answer = await confirm(translateApp(lang, 'pages.globalNameHint'), {
      title: translateApp(lang, 'pages.ctxSaveGlobal'),
      icon: 'info',
      input: 'text',
      inputValue: label,
      inputAttributes: { maxlength: '120' },
      inputValidator: (value: string) =>
        value.trim() === '' ? translateApp(lang, 'pages.globalNameRequired') : undefined,
    });
    if (!answer.isConfirmed) return;
    const name = String(answer.value ?? '').trim();
    const document = globalDocumentFromBlock(block);
    try {
      const res = await getApiClient(null).post<GlobalRow>(API_ENDPOINTS.APPEARANCE.GLOBALS, {
        name,
        status: 'published',
        document,
      });
      const id = Number(res.data?.id);
      if (!id) throw new Error('Missing global id');
      globals.value = { ...globals.value, [String(id)]: { name, document: res.data?.document ?? document } };
      requested.value = [...requested.value, id];
      await commit$(updateBlockAtPath(ensurePageLayoutBands(sections.value), path, (b) => linkBlockToGlobal(b, id)));
      await onCreated$(id, name);
      showSuccess(translateApp(lang, 'pages.globalSaved'));
    } catch (err) {
      console.error('Save as global failed', err);
      showError(translateApp(lang, 'pages.globalSaveFailed'));
    }
  });

  const unlinkGlobal$ = $(async (path: LayoutTreePath) => {
    const current = ensurePageLayoutBands(sections.value);
    const block = layoutTreeNodeAt(current, path) as PageLayoutBlock | null;
    if (!isResolvedGlobalPlacement(block)) return;
    await commit$(updateBlockAtPath(current, path, (b) => unlinkGlobalBlock(b, globals.value, registry.value)));
    showSuccess(translateApp(lang, 'pages.globalUnlinked'));
  });

  /** Writes edited globals back before the page itself is saved; false stops the save. */
  const saveChangedGlobals$ = $(async (): Promise<boolean> => {
    const changes = changedGlobalDocuments(ensurePageLayoutBands(sections.value), globals.value);
    for (const change of changes) {
      try {
        await getApiClient(null).put(`${API_ENDPOINTS.APPEARANCE.GLOBALS}/${change.id}`, { document: change.document });
        const entry = globals.value[String(change.id)];
        globals.value = { ...globals.value, [String(change.id)]: { ...entry, document: change.document } };
      } catch (err) {
        console.error('Global widget save failed', change.id, err);
        showError(translateApp(lang, 'pages.globalSaveFailed'));
        return false;
      }
    }
    return true;
  });

  return { globals, saveAsGlobal$, unlinkGlobal$, saveChangedGlobals$ };
}
