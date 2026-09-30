import { component$, useStyles$ } from '@builder.io/qwik';
import type { Testimonial } from '../../lib/marketing/types';
import { ContentImage } from './ContentImage';
import styles from '~/components/marketing/widgets/testimonial-card.css?inline';

export type TestimonialCardVariant = 'card' | 'minimal';

export interface TestimonialCardProps {
  testimonial: Testimonial;
  variant?: TestimonialCardVariant;
  showRating?: boolean;
  showAvatar?: boolean;
  showRole?: boolean;
  showProject?: boolean;
}

/** Colours, type and sizes come from testimonial-card.css (host widget Style tab → Card, Quote, …). */
export const TestimonialCard = component$<TestimonialCardProps>(
  ({ testimonial: t, variant = 'card', showRating = true, showAvatar = true, showRole = true, showProject = true }) => {
    useStyles$(styles);
    const meta = [showRole ? t.authorRole : undefined, showProject ? t.projectTitle : undefined]
      .filter(Boolean)
      .join(' · ');

    return (
      <div class={`tc-root flex h-full flex-col ${variant === 'card' ? 'tc-card' : ''}`}>
        {/* Star rating (decorative; rating value is not announced separately) */}
        {showRating && t.rating != null && (
          <div class="tc-stars mb-2 flex gap-0.5" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} class="tc-star" data-on={i < (t.rating ?? 0) ? '' : undefined}>
                ★
              </span>
            ))}
          </div>
        )}
        <blockquote class="tc-quote flex-1">&ldquo;{t.quote}&rdquo;</blockquote>
        <footer class="tc-footer mt-4">
          <cite class="not-italic">
            <span class="flex items-center gap-3">
              {showAvatar && (
                <ContentImage
                  src={t.authorAvatar}
                  alt={`${t.authorName} photo`}
                  width={40}
                  height={40}
                  loading="lazy"
                  class="tc-avatar shrink-0 object-cover"
                />
              )}
              <span class="min-w-0 flex-1">
                <span class="tc-name block">{t.authorName}</span>
                {meta && <span class="tc-meta block">{meta}</span>}
              </span>
            </span>
          </cite>
        </footer>
      </div>
    );
  },
);
