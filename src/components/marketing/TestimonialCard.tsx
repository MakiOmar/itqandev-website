import { component$ } from '@builder.io/qwik';
import type { Testimonial } from '../../lib/marketing/types';
import { Card } from './Card';
import { ContentImage } from './ContentImage';

export type TestimonialCardVariant = 'card' | 'minimal';

export interface TestimonialCardProps {
  testimonial: Testimonial;
  variant?: TestimonialCardVariant;
  showRating?: boolean;
  showAvatar?: boolean;
  showRole?: boolean;
  showProject?: boolean;
}

export const TestimonialCard = component$<TestimonialCardProps>(
  ({ testimonial: t, variant = 'card', showRating = true, showAvatar = true, showRole = true, showProject = true }) => {
    const meta = [showRole ? t.authorRole : undefined, showProject ? t.projectTitle : undefined]
      .filter(Boolean)
      .join(' · ');

    const body = (
      <>
        {/* Star rating (decorative; rating value is not announced separately) */}
        {showRating && t.rating != null && (
          <div class="mb-2 flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} class={i < (t.rating ?? 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-600'}>
                ★
              </span>
            ))}
          </div>
        )}
        <blockquote class="flex-1 text-slate-700 dark:text-slate-300">&ldquo;{t.quote}&rdquo;</blockquote>
        <footer
          class={
            variant === 'card'
              ? 'mt-4 border-t border-slate-200 pt-4 dark:border-slate-600'
              : 'mt-4'
          }
        >
          <cite class="not-italic">
            <span class="flex items-center gap-3">
              {showAvatar && (
                <ContentImage
                  src={t.authorAvatar}
                  alt={`${t.authorName} photo`}
                  width={40}
                  height={40}
                  loading="lazy"
                  class="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                />
              )}
              <span class="min-w-0 flex-1">
                <span class="block font-semibold text-slate-900 dark:text-white">{t.authorName}</span>
                {meta && <span class="block text-sm text-slate-500 dark:text-slate-400">{meta}</span>}
              </span>
            </span>
          </cite>
        </footer>
      </>
    );

    return variant === 'card' ? (
      <Card class="flex h-full flex-col">{body}</Card>
    ) : (
      <div class="flex h-full flex-col">{body}</div>
    );
  },
);
