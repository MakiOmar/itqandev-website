import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '~/lib/marketing/types';
import { TestimonialCard } from '~/components/marketing/TestimonialCard';
import { carouselItemBasisClassNames, gridColumnClassNames } from '~/lib/marketing/grid-columns';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import { translateApp } from '~/lib/i18n/useTranslate';
import { TestimonialsCarousel } from './TestimonialsCarousel';
import { testimonialListOptions } from './testimonial-list-options';

export type TestimonialsWidgetProps = {
  settings: Record<string, unknown>;
  testimonials: Testimonial[];
  uiLocale: string;
  /** Builder canvas: show a hint instead of nothing when no testimonials match. */
  editorPreview?: boolean;
};

/** `testimonial_list` page-builder widget: approved testimonials for the page locale as grid or carousel. */
export const TestimonialsWidget = component$<TestimonialsWidgetProps>((props) => {
  const opts = testimonialListOptions(props.settings);
  const items = props.testimonials.slice(0, opts.limit);
  if (items.length === 0 && !props.editorPreview) return null;

  const cards = (itemClass: string) =>
    items.map((t) => (
      <li key={t.id} class={itemClass}>
        <TestimonialCard
          testimonial={t}
          variant={opts.cardStyle}
          showRating={opts.showRating}
          showAvatar={opts.showAvatar}
          showRole={opts.showRole}
          showProject={opts.showProject}
        />
      </li>
    ));

  return (
    <div>
      {/* Optional heading (translatable widget settings) */}
      {opts.title || opts.subtitle ? (
        <div class="mx-auto mb-10 max-w-2xl text-center">
          {opts.title ? (
            <h2 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{opts.title}</h2>
          ) : null}
          {opts.subtitle ? (
            <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">{opts.subtitle}</p>
          ) : null}
        </div>
      ) : null}
      {items.length === 0 ? (
        // Editor-only notice; the public site renders nothing for an empty list.
        <p class="rounded-lg border border-dashed border-amber-400 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-100">
          {translateApp(props.uiLocale, 'testimonials.editorEmpty')}{' '}
          <a
            class="font-semibold underline"
            href={getLocalizedRoutes(props.uiLocale).ADMIN.TESTIMONIALS}
            target="_blank"
            rel="noopener"
          >
            {translateApp(props.uiLocale, 'testimonials.editorEmptyLink')}
          </a>
        </p>
      ) : opts.layout === 'carousel' ? (
        <TestimonialsCarousel uiLocale={props.uiLocale} autoplay={opts.autoplay} autoplayMs={opts.autoplayMs}>
          {cards(`${carouselItemBasisClassNames(opts.columns)} snap-start`)}
        </TestimonialsCarousel>
      ) : (
        <ul class={`${gridColumnClassNames(opts.columns)} gap-6`} role="list">
          {cards('min-w-0')}
        </ul>
      )}
    </div>
  );
});
