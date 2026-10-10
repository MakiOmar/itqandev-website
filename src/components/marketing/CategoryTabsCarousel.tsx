import {
  component$,
  useSignal,
  useStyles$,
  useVisibleTask$,
  $,
  type QRL,
} from '@builder.io/qwik';
import styles from '~/components/marketing/widgets/category-tabs.css?inline';
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

/** Nav chevron drawn for LTR; `.ct-root:dir(rtl)` mirrors it. Sized and coloured by `.ct-nav`. */
const Chevron = (props: { towardEnd: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d={props.towardEnd ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} />
  </svg>
);

function isRtlElement(el: HTMLElement): boolean {
  return getComputedStyle(el).direction === 'rtl';
}

/**
 * Horizontal category tabs with prev/next controls (no native scrollbar).
 * Direction follows the surrounding content (not the UI locale), so Arabic content starts at the
 * right even under an English UI. Colours/sizes/alignment come from category-tabs.css,
 * overridable by the host widget's Style tab.
 */
export const CategoryTabsCarousel = component$<CategoryTabsCarouselProps>((props) => {
  useStyles$(styles);
  const scrollerRef = useSignal<HTMLDivElement>();
  const canPrev = useSignal(false);
  const canNext = useSignal(false);

  const syncEdges$ = $(() => {
    const el = scrollerRef.value;
    if (!el) {
      canPrev.value = false;
      canNext.value = false;
      return;
    }
    const rtl = isRtlElement(el);
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
    const delta = isRtlElement(el) ? -forward * amount : forward * amount;
    el.scrollBy({ left: delta, behavior: 'smooth' });
    window.setTimeout(() => {
      void syncEdges$();
    }, 320);
  });

  return (
    <div class="ct-root mt-8" data-category-tabs-carousel>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="ct-nav"
          aria-label={translateApp(props.uiLocale, 'homePage.tabsPrev')}
          disabled={!canPrev.value}
          onClick$={() => scrollByDir$('prev')}
        >
          {/* Visual chevron: points toward start (leading side) */}
          <Chevron towardEnd={false} />
        </button>

        {/* No `dir` here: the rail inherits the content direction from its section */}
        <div
          ref={scrollerRef}
          class="ct-rail flex min-w-0 flex-1 gap-1 overflow-x-auto scroll-smooth pb-px [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x snap-mandatory"
          role="tablist"
          aria-label={props.label}
        >
          <button
            type="button"
            role="tab"
            aria-selected={props.activeTab === 'all'}
            class="ct-tab"
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
              class="ct-tab"
              onClick$={() => props.onSelect$(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          class="ct-nav"
          aria-label={translateApp(props.uiLocale, 'homePage.tabsNext')}
          disabled={!canNext.value}
          onClick$={() => scrollByDir$('next')}
        >
          <Chevron towardEnd={true} />
        </button>
      </div>
    </div>
  );
});
