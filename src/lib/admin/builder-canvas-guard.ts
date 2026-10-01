/**
 * Keeps rendered content inside builder canvases inert: links and forms in the
 * preview must not navigate away from the editor, while clicks still bubble to
 * the canvas node handlers that drive selection.
 */

import { useVisibleTask$ } from '@builder.io/qwik';

export const BUILDER_CANVAS_SELECTOR = '[data-builder-canvas]';

function isInsideCanvas(target: EventTarget | null, selector: string): target is Element {
  return target instanceof Element && !!target.closest(BUILDER_CANVAS_SELECTOR) && !!target.closest(selector);
}

/** Prevents the default action only; propagation is left intact so selection still runs. */
export function preventBuilderCanvasNavigation(e: Event): void {
  if (e.type === 'submit') {
    if (isInsideCanvas(e.target, 'form')) e.preventDefault();
    return;
  }
  if (isInsideCanvas(e.target, 'a[href], area[href]')) e.preventDefault();
}

export function useBuilderCanvasGuard() {
  // Native capture listener: Qwik `onClick$` handlers may resolve after the browser has already followed the link.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(
    ({ cleanup }) => {
      const events = ['click', 'auxclick', 'submit'] as const;
      for (const type of events) document.addEventListener(type, preventBuilderCanvasNavigation, true);
      cleanup(() => {
        for (const type of events) document.removeEventListener(type, preventBuilderCanvasNavigation, true);
      });
    },
    { strategy: 'document-ready' },
  );
}
