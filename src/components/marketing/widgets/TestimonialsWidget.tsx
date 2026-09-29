import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '~/lib/marketing/types';
import { TestimonialCard } from '~/components/marketing/TestimonialCard';
import { carouselItemBasisClassNames, gridColumnClassNames } from '~/lib/marketing/grid-columns';
import { TestimonialsCarousel } from './TestimonialsCarousel';
import { testimonialListOptions } from './testimonial-list-options';

export type TestimonialsWidgetProps = {
  settings: Record<string, unknown>;
  testimonials: Testimonial[];
  uiLocale: string;
};

/** `testimonial_list` page-builder widget: approved testimonials for the page locale as grid or carousel. */
export const TestimonialsWidget = component$<TestimonialsWidgetProps>((props) => {
  const opts = testimonialListOptions(props.settings);
  const items = props.testimonials.slice(0, opts.limit);
  if (items.length === 0) return null;

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

  if (opts.layout === 'carousel') {
    return (
      <TestimonialsCarousel uiLocale={props.uiLocale} autoplay={opts.autoplay} autoplayMs={opts.autoplayMs}>
        {cards(`${carouselItemBasisClassNames(opts.columns)} snap-start`)}
      </TestimonialsCarousel>
    );
  }

  return (
    <ul class={`${gridColumnClassNames(opts.columns)} gap-6`} role="list">
      {cards('min-w-0')}
    </ul>
  );
});
