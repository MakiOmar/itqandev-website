import { component$, useOnWindow, useSignal, useVisibleTask$, $, type QRL, type Signal } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { LayoutBreakpoint, PageLayoutBand } from '~/lib/marketing/appearance-types';
import {
  BuilderToolbarIcon,
  BUILDER_TOOLBAR_ICON_BTN,
} from '~/components/admin/BuilderToolbarIcons';
import {
  BUILDER_PREVIEW_DOCUMENT,
  BUILDER_PREVIEW_READY,
  isBuilderPreviewMessage,
  toPlainPreviewPayload,
} from '~/lib/admin/builder-preview-message';
import type { BuilderPreviewContext } from './PageBuilderCanvasBlock';

export type PageBuilderViewModeProps = {
  lang: string;
  ctx: BuilderPreviewContext;
  bands: PageLayoutBand[];
  /** Which site chrome the document replaces when `ctx.surface` is `chrome`. */
  chromeKind?: 'header' | 'footer';
  device: Signal<LayoutBreakpoint>;
  onClose$: QRL<() => void>;
};

const DEVICES: LayoutBreakpoint[] = ['mobile', 'tablet', 'desktop'];

function frameWidthClass(device: LayoutBreakpoint): string {
  if (device === 'mobile') return 'w-[390px] max-w-full';
  if (device === 'tablet') return 'w-[820px] max-w-full';
  return 'w-full';
}

/**
 * Full-page preview with editor panels hidden. Renders the admin `builder-preview`
 * route in an iframe sized to the device so real responsive breakpoints apply.
 */
export const PageBuilderViewMode = component$<PageBuilderViewModeProps>((props) => {
  const frameRef = useSignal<HTMLIFrameElement>();
  const frameReady = useSignal(false);

  const postDocument = $(() => {
    const win = frameRef.value?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: BUILDER_PREVIEW_DOCUMENT,
        payload: toPlainPreviewPayload({
          bands: props.bands,
          surface: props.ctx.surface,
          chromeKind: props.chromeKind,
          device: props.device.value,
          uiLocale: props.ctx.uiLocale,
          pageTitle: props.ctx.pageTitle,
          support: props.ctx.support,
        }),
      },
      window.location.origin,
    );
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frameRef.value?.contentWindow) return;
      if (!isBuilderPreviewMessage(e.data) || e.data.type !== BUILDER_PREVIEW_READY) return;
      frameReady.value = true;
      void postDocument();
    };
    window.addEventListener('message', onMessage);
    cleanup(() => window.removeEventListener('message', onMessage));
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => props.device.value);
    track(() => props.bands);
    if (frameReady.value) void postDocument();
  });

  useOnWindow(
    'keydown',
    $((e: Event) => {
      if ((e as KeyboardEvent).key === 'Escape') props.onClose$();
    }),
  );

  return (
    <div
      class="fixed inset-0 z-[70] flex flex-col bg-slate-200 dark:bg-slate-950"
      role="dialog"
      aria-modal="true"
      aria-label={translateApp(props.lang, 'pages.viewPage')}
    >
      {/* Minimal view-mode bar: back to editor + device switch */}
      <div class="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-1.5 dark:border-gray-800 dark:bg-slate-900">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick$={() => props.onClose$()}
        >
          <BuilderToolbarIcon name="exit" class="h-4 w-4" />
          {translateApp(props.lang, 'pages.backToEditor')}
        </button>
        <div
          class="inline-flex rounded-lg border border-gray-300 p-0.5 dark:border-gray-600"
          role="group"
          aria-label={translateApp(props.lang, 'pages.previewDevice')}
        >
          {DEVICES.map((device) => (
            <button
              key={device}
              type="button"
              aria-pressed={props.device.value === device ? 'true' : 'false'}
              aria-label={translateApp(props.lang, `pages.device.${device}`)}
              title={translateApp(props.lang, `pages.device.${device}`)}
              class={[
                'inline-flex h-8 w-8 items-center justify-center rounded-md',
                props.device.value === device
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
              ].join(' ')}
              onClick$={() => {
                props.device.value = device;
              }}
            >
              <BuilderToolbarIcon name={device} />
            </button>
          ))}
        </div>
        <button
          type="button"
          class={BUILDER_TOOLBAR_ICON_BTN}
          aria-label={translateApp(props.lang, 'common.close')}
          title={translateApp(props.lang, 'common.close')}
          onClick$={() => props.onClose$()}
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4Z" />
          </svg>
        </button>
      </div>

      {/* Device-sized frame: a real viewport so md:/lg: breakpoints match the frontend */}
      <div class="flex min-h-0 flex-1 justify-center overflow-hidden">
        <div class={[frameWidthClass(props.device.value), 'relative h-full transition-[width] duration-300'].join(' ')}>
          {frameReady.value ? null : (
            <div class="absolute inset-0 flex items-center justify-center bg-white text-gray-500 dark:bg-slate-900 dark:text-gray-400">
              <BuilderToolbarIcon name="spinner" class="h-6 w-6" />
            </div>
          )}
          <iframe
            ref={frameRef}
            src={`/${props.lang}/admin/builder-preview/`}
            title={translateApp(props.lang, 'pages.viewPage')}
            class="h-full w-full border-0 bg-white shadow-xl dark:bg-slate-900"
          />
        </div>
      </div>
    </div>
  );
});
