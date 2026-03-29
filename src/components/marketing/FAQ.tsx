import { component$ } from '@builder.io/qwik';
import type { FAQItem as FAQItemType } from '../../lib/marketing/types';
import { Container } from './Container';

export interface FAQProps {
  items: FAQItemType[];
  title?: string;
}

/**
 * Zero-JS FAQ using native <details>/<summary>.
 */
export const FAQ = component$<FAQProps>(({ items, title = 'Frequently asked questions' }) => {
  if (!items.length) return null;

  return (
    <section class="py-16 sm:py-20" aria-labelledby="faq-heading">
      <Container>
        <h2 id="faq-heading" class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          {title}
        </h2>
        <ul class="mt-10 space-y-4" role="list">
          {items.map((item, i) => (
            <li key={i}>
              <details class="group rounded-lg border border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-800/50 dark:backdrop-blur-none">
                <summary class="flex cursor-pointer list-none items-center justify-between px-4 py-4 font-medium text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <span class="ml-2 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true">
                    <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div class="border-t border-slate-200 px-4 py-3 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                  {item.answer}
                </div>
              </details>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
});
