import {
  component$,
  useSignal,
  useVisibleTask$,
  $,
  type QRL,
} from '@builder.io/qwik';
import { isUiLocaleRtl } from '~/lib/i18n/ui-locale-segments';
import { translateApp } from '~/lib/i18n/useTranslate';

export type CategoryTabItem = {
  id: number;
  slug: string;
  name: string;
};

export type CategoryTabsCarouselProps = {
  uiLocale: string;
  label: string;
  allLabel: string;
  activeTab: 'all' | string;
  categories: CategoryTabItem[];
  onSelect$: QRL<(tab: 'all' | string) => void>;
};

/**
 * Horizontal category tabs with prev/next controls (no native scrollbar).
 * Chevrons and scroll delta flip for RTL locales.
 */
export const CategoryTabsCarousel = component$<CategoryTabsCarouselProps>((props) => {
  const scrollerRef = useSignal<HTMLDivElement>();
  const canPrev = useSignal(false);
  const canNext = useSignal(false);
  const rtl = isUiLocaleRtl(props.uiLocale);

  const syncEdges$ = $(() => {
    const el = scrollerRef.value;
    if (!el) {
      canPrev.value = false;
      canNext.value = false;
      return;
    }
    const eps = 4;
    const overflow = el.scrollWidth - el.clientWidth > eps;
    if (!overflow) {
      canPrev.value = false;
      canNext.value = false;
      return;
    }
    const first = el.firstElementChild as HTMLElement | null;
    const last = el.lastElementChild as HTMLElement | null;
    if (!first || !last) {
      canPrev.value = false;
      canNext.value = overflow;
      return;
    }
    const box = el.getBoundingClientRect();
    const firstBox = first.getBoundingClientRect();
    const lastBox = last.getBoundingClientRect();
    if (rtl) {
      // Start is the right edge; "prev" reveals content toward the right (leading).
      canPrev.value = firstBox.right > box.right + eps;
      canNext.value = lastBox.left < box.left - eps;
    } else {
      canPrev.value = firstBox.left < box.left - eps;
      canNext.value = lastBox.right > box.right + eps;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const el = scrollerRef.value;
    if (!el) return;
    const run = () => {
      void syncEdges$();
    };
    run();
    el.addEventListener('scroll', run, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(run) : null;
    ro?.observe(el);
    cleanup(() => {
      el.removeEventListener('scroll', run);
      ro?.disconnect();
    });
  });

  const scrollByDir$ = $((dir: 'prev' | 'next') => {
    const el = scrollerRef.value;
    if (!el) return;
    const amount = Math.max(160, Math.floor(el.clientWidth * 0.7));
    const forward = dir === 'next' ? 1 : -1;
    const delta = rtl ? -forward * amount : forward * amount;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    window.setTimeout(() => {
      void syncEdges$();
    }, 320);
  });

  const tabClass = (selected: boolean) =>
    `shrink-0 snap-start px-4 py-2.5 text-sm font-medium transition-colors ${
      selected
        ? 'border-b-2 border-primary-600 text-primary-700 dark:border-primary-400 dark:text-primary-300'
        : 'border-b-2 border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
    }`;

  const chevronBtn =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700';

  return (
    <div class="mt-8" data-category-tabs-carousel>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class={chevronBtn}
          aria-label={translateApp(props.uiLocale, 'homePage.tabsPrev')}
          disabled={!canPrev.value}
          onClick$={() => scrollByDir$('prev')}
        >
          {/* Visual chevron: points toward start (leading side) */}
          <span aria-hidden="true">{rtl ? '›' : '‹'}</span>
        </button>

        <div
          ref={scrollerRef}
          class="flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth border-b border-slate-200 pb-px dark:border-slate-700 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
          role="tablist"
          aria-label={props.label}
          dir={rtl ? 'rtl' : 'ltr'}
        >
          <button
            type="button"
            role="tab"
            aria-selected={props.activeTab === 'all'}
            class={tabClass(props.activeTab === 'all')}
            onClick$={() => props.onSelect$('all')}
          >
            {props.allLabel}
          </button>
          {props.categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="tab"
              aria-selected={props.activeTab === category.slug}
              class={tabClass(props.activeTab === category.slug)}
              onClick$={() => props.onSelect$(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          class={chevronBtn}
          aria-label={translateApp(props.uiLocale, 'homePage.tabsNext')}
          disabled={!canNext.value}
          onClick$={() => scrollByDir$('next')}
        >
          <span aria-hidden="true">{rtl ? '‹' : '›'}</span>
        </button>
      </div>
    </div>
  );
});
