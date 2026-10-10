import { component$, type QRL } from '@builder.io/qwik';
import { ADMIN_NATIVE_SELECT_COMPACT_CLASS } from '~/lib/admin/native-select-classes';
import type { PreviewRecordOption } from '~/lib/admin/content-types';
import { translateApp } from '~/lib/i18n/useTranslate';

export type BuilderPreviewSourceBarProps = {
  lang: string;
  types: { key: string; label: string }[];
  type: string;
  records: PreviewRecordOption[];
  /** 0 = show `{{tags}}` instead of record data. */
  recordId: number;
  /** Records list or resolved preview is loading. */
  busy: boolean;
  error: string;
  onTypeChange$: QRL<(type: string) => void>;
  onRecordChange$: QRL<(recordId: number) => void>;
};

/**
 * "Preview with": the content type and record whose data fills the template's dynamic tags
 * in the canvas. Changes apply immediately; the saved layout is not touched.
 */
export const BuilderPreviewSourceBar = component$<BuilderPreviewSourceBarProps>((props) => {
  const t = (key: string) => translateApp(props.lang, `pages.${key}`);

  return (
    <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-slate-50 px-4 py-2 text-xs dark:border-gray-800 dark:bg-slate-950">
      <label for="builder-preview-type">{t('previewAs')}</label>
      {/* Content type */}
      <select
        id="builder-preview-type"
        class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
        value={props.type}
        onChange$={async (e) => {
          await props.onTypeChange$((e.target as HTMLSelectElement).value);
        }}
      >
        {props.types.map((type) => (
          <option key={type.key} value={type.key} selected={type.key === props.type}>
            {type.label}
          </option>
        ))}
      </select>
      {/* Record */}
      <select
        class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} max-w-xs`}
        aria-label={t('previewRecord')}
        value={String(props.recordId)}
        disabled={props.records.length === 0}
        onChange$={async (e) => {
          await props.onRecordChange$(Number((e.target as HTMLSelectElement).value) || 0);
        }}
      >
        <option value="0" selected={props.recordId === 0}>
          {props.records.length === 0 ? t('previewNoRecords') : t('previewShowTags')}
        </option>
        {props.records.map((row) => (
          <option key={row.id} value={String(row.id)} selected={row.id === props.recordId}>
            {row.title}
          </option>
        ))}
      </select>
      {/* Status */}
      {props.busy ? (
        <span class="text-gray-500" role="status">{t('previewLoading')}</span>
      ) : props.error ? (
        <span class="text-red-600" role="alert">{props.error}</span>
      ) : props.recordId > 0 ? (
        <span class="text-gray-500">{t('previewLiveHint')}</span>
      ) : null}
    </div>
  );
});
