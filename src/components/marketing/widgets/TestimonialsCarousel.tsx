import { component$, useSignal, useVisibleTask$, $, Slot } from '@builder.io/qwik';
import { isUiLocaleRtl } from '~/lib/i18n/ui-locale-segments';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { CarouselArrowsPosition } from './testimonial-list-options';

export type TestimonialsCarouselProps = {
  uiLocale: string;
  autoplay: boolean;
  autoplayMs: number;
  arrowsPosition: CarouselArrowsPosition;
};

/** Left/right are physical screen sides; flex start flips under RTL, so swap there. */
function arrowsJustifyClass(align: 'left' | 'center' | 'right' | 'between', rtl: boolean): string {
  if (align === 'center') return 'justify-center';
  if (align === 'between') return 'justify-between';
  const start = align === 'left' ? !rtl : rtl;
  return start ? 'justify-start' : 'justify-end';
}

const CHEVRON_BTN =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

/**
 * Scroll-snap track for testimonial slides (slides are the slotted `<li>` children).
 * Autoplay pauses on hover/focus and is skipped for `prefers-reduced-motion`.
 */
export const TestimonialsCarousel = component$<TestimonialsCarouselProps>((props) => {
  const trackRef = useSignal<HTMLUListElement>();
  const canPrev = useSignal(false);
  const canNext = useSignal(false);
  const rtl = isUiLocaleRtl(props.uiLocale);

  const syncEdges = $(() => {
    const el = trackRef.value;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const pos = Math.abs(el.scrollLeft);
    canPrev.value = pos > 4;
    canNext.value = max - pos > 4;
  });

  const step = $((dir: 1 | -1, wrap = false) => {
    const el = trackRef.value;
    if (!el) return;
    const slide = el.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const amount = (slide?.offsetWidth ?? el.clientWidth) + gap;
    const atEnd = el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) <= 4;
    if (wrap && dir === 1 && atEnd) {
      el.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    el.scrollBy({ left: (rtl ? -dir : dir) * amount, behavior: 'smooth' });
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const el = trackRef.value;
    if (!el) return;
    const run = () => void syncEdges();
    run();
    el.addEventListener('scroll', run, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
    ro?.observe(el);

    let timer: number | undefined;
    let paused = false;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (props.autoplay && !reduceMotion) {
      const pause = () => (paused = true);
      const resume = () => (paused = false);
      el.addEventListener('mouseenter', pause);
      el.addEventListener('mouseleave', resume);
      el.addEventListener('focusin', pause);
      el.addEventListener('focusout', resume);
      timer = window.setInterval(() => {
        if (!paused && document.visibilityState === 'visible') void step(1, true);
      }, props.autoplayMs);
      cleanup(() => {
        el.removeEventListener('mouseenter', pause);
        el.removeEventListener('mouseleave', resume);
        el.removeEventListener('focusin', pause);
        el.removeEventListener('focusout', resume);
      });
    }

    cleanup(() => {
      el.removeEventListener('scroll', run);
      ro?.disconnect();
      if (timer) window.clearInterval(timer);
    });
  });

  const prevBtn = (
    <button
      type="button"
      class={CHEVRON_BTN}
      aria-label={translateApp(props.uiLocale, 'testimonials.carouselPrev')}
      disabled={!canPrev.value}
      onClick$={() => step(-1)}
    >
      {/* Chevron points toward the reading-start side */}
      <span aria-hidden="true">{rtl ? '›' : '‹'}</span>
    </button>
  );
  const nextBtn = (
    <button
      type="button"
      class={CHEVRON_BTN}
      aria-label={translateApp(props.uiLocale, 'testimonials.carouselNext')}
      disabled={!canNext.value}
      onClick$={() => step(1)}
    >
      <span aria-hidden="true">{rtl ? '‹' : '›'}</span>
    </button>
  );
  const track = (
    <ul
      ref={trackRef}
      class="flex min-w-0 flex-1 snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="list"
      dir={rtl ? 'rtl' : 'ltr'}
    >
      <Slot />
    </ul>
  );

  if (props.arrowsPosition === 'sides') {
    return (
      <div class="flex items-center gap-2" data-testimonials-carousel>
        {prevBtn}
        {track}
        {nextBtn}
      </div>
    );
  }

  const [edge, align] = props.arrowsPosition.split('_') as ['top' | 'bottom', 'left' | 'center' | 'right' | 'between'];
  // Arrow row wrapper: physical alignment, independent of page direction
  const nav = (
    <div class={`flex items-center gap-2 ${arrowsJustifyClass(align, rtl)}`} dir={rtl ? 'rtl' : 'ltr'}>
      {prevBtn}
      {nextBtn}
    </div>
  );

  return (
    <div class="flex flex-col gap-4" data-testimonials-carousel>
      {edge === 'top' ? nav : null}
      {track}
      {edge === 'bottom' ? nav : null}
    </div>
  );
});
