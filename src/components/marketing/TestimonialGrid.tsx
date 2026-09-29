import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '../../lib/marketing/types';
import { Container } from './Container';
import { TestimonialCard } from './TestimonialCard';

export interface TestimonialGridProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
}

export const TestimonialGrid = component$<TestimonialGridProps>(
  ({ testimonials, title = 'What our clients say', subtitle }) => {
    if (!testimonials.length) return null;

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
          <ul
            class="mx-auto mt-12 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
          >
            {testimonials.map((t) => (
              <li key={t.id}>
                <TestimonialCard testimonial={t} />
              </li>
            ))}
          </ul>
        </Container>
      </section>
    );
  }
);
