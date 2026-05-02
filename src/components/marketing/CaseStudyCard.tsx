import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import type { CaseStudy } from '../../lib/marketing/types';
import { marketingRoutes } from '../../lib/marketing/constants';
import { Card } from './Card';
import { ContentImage } from './ContentImage';

export interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  /** If true, show as featured (larger, more detail) */
  featured?: boolean;
}

export const CaseStudyCard = component$<CaseStudyCardProps>(({ caseStudy, featured }) => {
  const locale = useSpeakLocale();
  const MR = marketingRoutes(locale.lang === 'ar' ? 'ar' : 'en');
  const href = MR.workSlug(caseStudy.slug);

  return (
    <Link href={href} class="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl">
      <Card padding="none" class="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div class="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
          <ContentImage
            src={caseStudy.image}
            alt={caseStudy.imageAlt || caseStudy.title}
            width={400}
            height={240}
            loading="lazy"
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
