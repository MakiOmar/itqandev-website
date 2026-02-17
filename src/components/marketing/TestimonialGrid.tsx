import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '../../lib/marketing/types';
import { Card } from './Card';
import { Container } from './Container';

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
                <Card class="h-full flex flex-col">
                  {t.rating != null && (
                    <div class="mb-2 flex gap-0.5" aria-hidden="true">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          class={i < (t.rating ?? 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <blockquote class="flex-1 text-slate-700 dark:text-slate-300">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <footer class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-600">
                    <cite class="not-italic">
                      <span class="font-semibold text-slate-900 dark:text-white">
                        {t.authorName}
                      </span>
                      {t.authorRole && (
                        <span class="block text-sm text-slate-500 dark:text-slate-400">
                          {t.authorRole}
                          {t.projectTitle && ` · ${t.projectTitle}`}
                        </span>
                      )}
                    </cite>
                  </footer>
                </Card>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    );
  }
);
