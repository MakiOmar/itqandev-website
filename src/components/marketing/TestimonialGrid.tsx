import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '../../lib/marketing/types';
import { carouselItemBasisClassNames } from '../../lib/marketing/grid-columns';
import { Container } from './Container';
import { TestimonialCard } from './TestimonialCard';
import { TestimonialsCarousel } from './widgets/TestimonialsCarousel';
import type { CarouselArrowsPosition } from './widgets/testimonial-list-options';

export interface TestimonialGridCarousel {
  uiLocale: string;
  autoplay: boolean;
  autoplayMs: number;
  arrowsPosition: CarouselArrowsPosition;
}

export interface TestimonialGridProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  /** When set, slides render in the shared carousel instead of the 3-column grid. */
  carousel?: TestimonialGridCarousel;
}

const CAROUSEL_SLIDE_CLASS = `${carouselItemBasisClassNames({ mobile: 1, tablet: 2, desktop: 3 })} snap-start`;

export const TestimonialGrid = component$<TestimonialGridProps>(
  ({ testimonials, title = 'What our clients say', subtitle, carousel }) => {
    if (!testimonials.length) return null;

    const items = (itemClass?: string) =>
      testimonials.map((t) => (
        <li key={t.id} class={itemClass}>
          <TestimonialCard testimonial={t} />
        </li>
      ));

    return (
      <section class="py-16 sm:py-20 lg:py-24" aria-labelledby="testimonials-heading">
        <Container>
          <div class="mx-auto max-w-2xl text-center">
            <h2 id="testimonials-heading" class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p class="mt-2 text-lg text-slate-600 dark:text-slate-400">{subtitle}</p>
            )}
          </div>
          {carousel ? (
            <div class="mx-auto mt-12 max-w-5xl">
              <TestimonialsCarousel
                uiLocale={carousel.uiLocale}
                autoplay={carousel.autoplay}
                autoplayMs={carousel.autoplayMs}
                arrowsPosition={carousel.arrowsPosition}
              >
                {items(CAROUSEL_SLIDE_CLASS)}
              </TestimonialsCarousel>
            </div>
          ) : (
            <ul
              class="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
            >
              {items()}
            </ul>
          )}
        </Container>
      </section>
    );
  }
);
