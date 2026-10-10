import { component$, useSignal, type QRL } from '@builder.io/qwik';
import type { DynamicTagCatalog } from '~/lib/admin/appearance-actions';
import { appearanceMediaDynamicTag, appearanceMediaId } from '~/lib/admin/appearance-media-ref';
import { imageDynamicTagCatalog } from '~/lib/admin/builder-dynamic-tags';
import { translateApp } from '~/lib/i18n/useTranslate';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import { BuilderDynamicTagButton } from './BuilderDynamicTagButton';
import { DatabaseGlyph, PlusGlyph, TrashGlyph } from './InspectorGlyphs';
import {
  INSPECTOR_CHECKER_STYLE,
  INSPECTOR_INPUT,
  INSPECTOR_OVERLAY_BTN,
  INSPECTOR_STACK_LABEL,
} from './inspector-classes';

export type MediaPreviewPanelProps = {
  label: string;
  lang: string;
  /** Stored setting (media id, `{id,url}` ref or plain URL). */
  value: unknown;
  previewSrc?: string | null;
  onPick$: QRL<() => void>;
  onClear$: QRL<() => void>;
  /** When set, a collapsed "Or paste URL" input is offered under the preview. */
  urlValue?: string;
  onUrlInput$?: QRL<(url: string) => void>;
  /** Shorter preview for repeater rows. */
  compact?: boolean;
  /** Builder tag catalog; only `image` tags are offered. Picking one stores the `{{tag}}` token. */
  tags?: DynamicTagCatalog;
  onTagPick$?: QRL<(token: string) => void>;
};

/** Elementor-style media control: large preview that opens the library, remove on the preview, optional URL. */
export const MediaPreviewPanel = component$<MediaPreviewPanelProps>((props) => {
  const urlOpen = useSignal(!!props.urlValue);
  const t = (key: string) => translateApp(props.lang, `appearance.${key}`);
  const hasValue = props.value !== undefined && props.value !== null && props.value !== '';
  const src = props.previewSrc ? resolveLaravelMediaUrl(props.previewSrc) || props.previewSrc : '';
  const mediaId = appearanceMediaId(props.value);
  const pickLabel = hasValue ? t('changeImage') : t('chooseImage');
  const imageTags = props.tags && props.onTagPick$ ? imageDynamicTagCatalog(props.tags) : null;
  const dynamicTag = appearanceMediaDynamicTag(props.value);
  const onUrlInput$ = props.onUrlInput$;
  const dynamicLabel = dynamicTag
    ? (props.tags?.tags.find((tag) => tag.id === dynamicTag)?.label ?? t('dynamicImage'))
    : '';

  return (
    <div>
      {/* Label row; the dynamic-tag trigger sits at its end */}
      <div class={['relative', imageTags?.tags.length ? 'pe-8' : ''].join(' ')}>
        <span class={INSPECTOR_STACK_LABEL}>{props.label}</span>
        {imageTags && props.onTagPick$ ? (
          <BuilderDynamicTagButton catalog={imageTags} lang={props.lang} onInsert$={props.onTagPick$} />
        ) : null}
      </div>
      {/* Preview: click opens the media library */}
      <div
        class="group relative overflow-hidden rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-slate-950"
        style={INSPECTOR_CHECKER_STYLE}
      >
        <button
          type="button"
          class={[
            'flex w-full items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500',
            props.compact ? 'h-24' : 'h-36',
          ].join(' ')}
          aria-label={pickLabel}
          onClick$={props.onPick$}
        >
          {dynamicTag ? (
            <span class="flex flex-col items-center gap-1 px-3 text-center text-xs font-medium text-primary-700 dark:text-primary-300">
              <DatabaseGlyph size={18} />
              {dynamicLabel}
              <code class="text-[10px] font-normal text-gray-500" dir="ltr">{`{{${dynamicTag}}}`}</code>
            </span>
          ) : src ? (
            <img src={src} alt="" class="h-full w-full object-contain" />
          ) : mediaId !== null ? (
            <span class="text-xs text-gray-500">#{mediaId}</span>
          ) : (
            <span class="flex flex-col items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <PlusGlyph />
              {t('chooseImage')}
            </span>
          )}
        </button>
        {/* Hover hint when something is already chosen */}
        {hasValue ? (
          <span class="pointer-events-none absolute inset-x-0 bottom-0 bg-gray-900/70 py-1 text-center text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            {t('changeImage')}
          </span>
        ) : null}
        {hasValue ? (
          <button
            type="button"
            class={INSPECTOR_OVERLAY_BTN}
            title={t('removeImage')}
            aria-label={t('removeImage')}
            onClick$={props.onClear$}
          >
            <TrashGlyph />
          </button>
        ) : null}
      </div>
      {/* Paste a URL instead of using the library (collapsed by default) */}
      {props.onUrlInput$ ? (
        <div class="mt-1.5">
          <button
            type="button"
            class="text-[11px] font-medium text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
            aria-expanded={urlOpen.value}
            onClick$={() => {
              urlOpen.value = !urlOpen.value;
            }}
          >
            {urlOpen.value ? '− ' : '+ '}
            {t('orPasteUrl')}
          </button>
          {urlOpen.value ? (
            <input
              type="url"
              dir="ltr"
              class={`${INSPECTOR_INPUT} mt-1`}
              placeholder="https://"
              aria-label={t('orPasteUrl')}
              value={props.urlValue ?? ''}
              onInput$={async (e) => {
                await onUrlInput$?.((e.target as HTMLInputElement).value);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
