import { component$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import { builderTemplateKindLabel } from '~/lib/admin/builder-template-labels';
import type { BuilderTemplateRow } from '~/lib/admin/builder-templates';
import type { AppearanceRegistryEntry } from '~/lib/marketing/appearance-types';

export type BuilderTemplatesPanelProps = {
  lang: string;
  templates: BuilderTemplateRow[];
  loading: boolean;
  /** Template being inserted; its button shows a spinner and the others are disabled. */
  busyId: number | null;
  /** Lowercased palette search. */
  search: string;
  registry: AppearanceRegistryEntry[];
  onInsert$: QRL<(id: number) => void>;
  onDelete$: QRL<(row: BuilderTemplateRow) => void>;
};

/** Palette tab listing saved templates; clicking one inserts a copy at the selection. */
export const BuilderTemplatesPanel = component$<BuilderTemplatesPanelProps>((props) => {
  const rows = props.search
    ? props.templates.filter((row) =>
        `${row.name} ${builderTemplateKindLabel(props.lang, row, props.registry)}`.toLowerCase().includes(props.search),
      )
    : props.templates;

  return (
    <div class="space-y-2">
      {/* Where a click inserts the template */}
      <p class="text-[11px] text-gray-500 dark:text-gray-400">{translateApp(props.lang, 'pages.templatesHint')}</p>

      {/* Loading state (first load only; reloads keep the current list visible) */}
      {props.loading && props.templates.length === 0 ? (
        <p class="flex items-center gap-2 px-1 py-3 text-xs text-gray-500 dark:text-gray-400" role="status">
          <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" aria-hidden="true" />
          {translateApp(props.lang, 'common.loading')}
        </p>
      ) : null}

      {/* Empty states: no templates yet, or none match the search */}
      {!props.loading && props.templates.length === 0 ? (
        <p class="rounded-lg border border-dashed border-gray-300 px-3 py-3 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
          {translateApp(props.lang, 'pages.templatesEmpty')}
        </p>
      ) : null}
      {props.templates.length > 0 && rows.length === 0 ? (
        <p class="px-1 py-2 text-xs text-gray-500 dark:text-gray-400">{translateApp(props.lang, 'pages.templatesNoMatch')}</p>
      ) : null}

      {/* Template rows: insert button plus delete */}
      {rows.map((row) => (
        <div
          key={row.id}
          class="flex items-stretch overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-950"
        >
          <button
            type="button"
            class="min-w-0 flex-1 px-3 py-2 text-start hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60 dark:hover:bg-slate-900"
            disabled={props.busyId !== null}
            title={translateApp(props.lang, 'pages.templateInsert')}
            onClick$={() => props.onInsert$(row.id)}
          >
            <span class="flex items-center gap-2">
              {props.busyId === row.id ? (
                <span class="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-gray-300 border-t-primary-600" aria-hidden="true" />
              ) : null}
              <span class="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{row.name}</span>
            </span>
            <span class="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
              {builderTemplateKindLabel(props.lang, row, props.registry)}
            </span>
          </button>
          <button
            type="button"
            class="border-s border-gray-200 px-2.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:bg-red-950/40"
            aria-label={`${translateApp(props.lang, 'common.delete')} ${row.name}`}
            title={translateApp(props.lang, 'common.delete')}
            onClick$={() => props.onDelete$(row)}
          >
            {/* Trash icon (inline SVG, no third-party icon code) */}
            <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 6h18M8 6V4h8v2m-9 0l1 14h8l1-14"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
});
