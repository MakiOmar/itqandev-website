import { component$, useSignal, type QRL } from '@builder.io/qwik';
import { appearanceMediaId } from '~/lib/admin/appearance-media-ref';
import { translateApp } from '~/lib/i18n/useTranslate';
import { resolveLaravelMediaUrl } from '~/lib/marketing/resolve-laravel-media-url';
import { PlusGlyph, TrashGlyph } from './InspectorGlyphs';
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
};

/** Elementor-style media control: large preview that opens the library, remove on the preview, optional URL. */
export const MediaPreviewPanel = component$<MediaPreviewPanelProps>((props) => {
  const urlOpen = useSignal(!!props.urlValue);
  const t = (key: string) => translateApp(props.lang, `appearance.${key}`);
  const hasValue = props.value !== undefined && props.value !== null && props.value !== '';
  const src = props.previewSrc ? resolveLaravelMediaUrl(props.previewSrc) || props.previewSrc : '';
  const mediaId = appearanceMediaId(props.value);
  const pickLabel = hasValue ? t('changeImage') : t('chooseImage');

  return (
    <div>
      <span class={INSPECTOR_STACK_LABEL}>{props.label}</span>
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
          {src ? (
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
                await props.onUrlInput$?.((e.target as HTMLInputElement).value);
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});
