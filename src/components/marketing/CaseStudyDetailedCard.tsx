import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import type { CaseStudy } from '../../lib/marketing/types';
import { marketingRoutes } from '../../lib/marketing/constants';
import { translateApp } from '../../lib/i18n/translate-app';
import { ContentImage } from './ContentImage';
import './case-study-card.css';

export interface CaseStudyDetailedCardProps {
  caseStudy: CaseStudy;
}

const MAX_CHIPS = 3;

function chipLabels(caseStudy: CaseStudy): string[] {
  const skills = (caseStudy.skills ?? []).map((skill) => skill.name).filter(Boolean);
  const source = skills.length > 0 ? skills : (caseStudy.tags ?? []);
  return source.slice(0, MAX_CHIPS);
}

export const CaseStudyDetailedCard = component$<CaseStudyDetailedCardProps>(({ caseStudy }) => {
  const locale = useSpeakLocale();
  const href = marketingRoutes(locale.lang).portfolioSlug(caseStudy.slug);
  const category = caseStudy.categories?.[0]?.name ?? '';
  const chips = chipLabels(caseStudy);
  const ctaLabel = translateApp(locale.lang, 'homePage.viewCaseStudy');

  return (
    <Link
      href={href}
      class="group case-study-card block h-full rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
    >
      <article class="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 dark:border-slate-700/70 dark:bg-slate-900 dark:shadow-indigo-950/30 dark:hover:border-indigo-500/50 dark:hover:shadow-indigo-500/20">
        {/* Media: pans the screenshot on hover like the overlay card */}
        <div class="case-study-card-viewport relative w-full bg-slate-100 dark:bg-slate-800">
          <ContentImage
            src={caseStudy.image}
            alt={caseStudy.imageAlt || caseStudy.title}
            width={640}
            height={480}
            loading="lazy"
            class="case-study-card-image block"
          />
        </div>

        {/* Body */}
        <div class="flex flex-1 flex-col gap-3 p-5 sm:p-6">
          {category ? (
            <span class="inline-flex w-fit max-w-full truncate rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              {category}
            </span>
          ) : null}

          <div>
            <h3 class="text-xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">{caseStudy.title}</h3>
            {caseStudy.summary ? (
              <p class="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{caseStudy.summary}</p>
            ) : null}
          </div>

          {chips.length > 0 ? (
            <ul class="flex flex-wrap gap-2" role="list">
              {chips.map((chip) => (
                <li
                  key={chip}
                  class="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  {chip}
                </li>
              ))}
            </ul>
          ) : null}

          {/* The whole card is the link; this is its visual call to action */}
          <span class="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white dark:bg-indigo-950/60 dark:text-indigo-200 dark:group-hover:bg-indigo-600 dark:group-hover:text-white">
            {ctaLabel}
            <span class="inline-block transition-transform group-hover:translate-x-1 rtl:-scale-x-100 rtl:group-hover:-translate-x-1" aria-hidden="true">
              →
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
});
