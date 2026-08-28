import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import type { CaseStudy } from '../../lib/marketing/types';
import { marketingRoutes } from '../../lib/marketing/constants';
import { ContentImage } from './ContentImage';
import './case-study-card.css';

export interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export const CaseStudyCard = component$<CaseStudyCardProps>(({ caseStudy }) => {
  const locale = useSpeakLocale();
  const MR = marketingRoutes(locale.lang);
  const href = MR.portfolioSlug(caseStudy.slug);

  return (
    <Link
      href={href}
      class="group case-study-card block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
    >
      <article class="relative h-full overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-900 shadow-sm transition-all duration-300 hover:border-primary-300/60 hover:shadow-xl hover:shadow-primary-500/10 dark:border-slate-600/50 dark:hover:border-primary-500/40 dark:hover:shadow-primary-950/40">
        <div class="case-study-card-viewport relative w-full bg-slate-100 dark:bg-slate-800">
          <ContentImage
            src={caseStudy.image}
            alt={caseStudy.imageAlt || caseStudy.title}
            width={640}
            height={480}
            loading="lazy"
            class="case-study-card-image block"
          />
          <div
            class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-5 pt-16"
            aria-hidden="true"
          />
        </div>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5">
          <h3 class="text-lg font-semibold tracking-tight text-white sm:text-xl">{caseStudy.title}</h3>
        </div>
      </article>
    </Link>
  );
});
