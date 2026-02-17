import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import type { CaseStudy } from '../../lib/marketing/types';
import { MARKETING_ROUTES } from '../../lib/marketing/constants';
import { Card } from './Card';

export interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  /** If true, show as featured (larger, more detail) */
  featured?: boolean;
}

const placeholderImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240"%3E%3Crect fill="%23e2e8f0" width="400" height="240"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="14"%3EProject%3C/text%3E%3C/svg%3E';

export const CaseStudyCard = component$<CaseStudyCardProps>(({ caseStudy, featured }) => {
  const href = MARKETING_ROUTES.workSlug(caseStudy.slug);
  const imgSrc = caseStudy.image || placeholderImage;

  return (
    <Link href={href} class="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl">
      <Card padding="none" class="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div class="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          <img
            src={imgSrc}
            alt={caseStudy.imageAlt || caseStudy.title}
            width={400}
            height={240}
            loading="lazy"
            decoding="async"
            class="h-full w-full object-cover"
          />
        </div>
        <div class="p-4 sm:p-6">
          {caseStudy.tags && caseStudy.tags.length > 0 && (
            <ul class="mb-2 flex flex-wrap gap-1.5" role="list">
              {caseStudy.tags.slice(0, 3).map((tag) => (
                <li
                  key={tag}
                  class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800 dark:bg-primary-900/40 dark:text-primary-200"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
            {caseStudy.title}
          </h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {caseStudy.summary}
          </p>
          {featured && caseStudy.description && (
            <p class="mt-2 text-sm text-slate-500 dark:text-slate-500 line-clamp-2">
              {caseStudy.description}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
});
