import { component$, useStyles$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import { useSpeakLocale } from 'qwik-speak';
import type { CaseStudy } from '../../lib/marketing/types';
import { marketingRoutes } from '../../lib/marketing/constants';
import { translateApp } from '../../lib/i18n/translate-app';
import { ContentImage } from './ContentImage';
import './case-study-card.css';
import styles from '~/components/marketing/widgets/case-study-card-detailed.css?inline';

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
  useStyles$(styles);
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
      <article class="csd-card">
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

        {/* Body: each part reserves a fixed height so cards in a row line up section by section */}
        <div class="csd-body">
          <span
            class={`csd-category ${category ? '' : 'invisible'}`}
            aria-hidden={category ? undefined : 'true'}
          >
            {category || '\u00a0'}
          </span>

          <div>
            <h3 class="csd-title" title={caseStudy.title}>
              {caseStudy.title}
            </h3>
            <p class="csd-summary">{caseStudy.summary}</p>
          </div>

          <ul class="csd-chips" role="list">
            {chips.map((chip) => (
              <li key={chip} class="csd-chip">
                {chip}
              </li>
            ))}
          </ul>

          {/* The whole card is the link; this is its visual call to action */}
          <span class="csd-button">
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
