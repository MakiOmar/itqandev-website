/**
 * Locale-aware `{section}` labels for title templates and breadcrumb JSON-LD.
 */

import { translateApp } from '~/lib/i18n/useTranslate';

type SeoSection = 'blog' | 'portfolio' | 'services' | 'pages' | 'home';

const STATIC_LABELS: Record<string, Record<SeoSection, string>> = {
  en: {
    home: 'Home',
    blog: 'Blog',
    portfolio: 'Portfolio',
    services: 'Services',
    pages: 'Pages',
  },
  ar: {
    home: 'الرئيسية',
    blog: 'المدونة',
    portfolio: 'الأعمال',
    services: 'الخدمات',
    pages: 'الصفحات',
  },
};

/** Localized section / crumb label. */
export function seoSectionLabel(lang: string, section: SeoSection): string {
  const code = String(lang || 'en')
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0] || 'en';

  if (section === 'home') {
    const fromArticles = translateApp(code, 'articlesPage.homeCrumb').trim();
    if (fromArticles && fromArticles !== 'articlesPage.homeCrumb') {
      return fromArticles;
    }
  }
  if (section === 'blog') {
    const fromArticles = translateApp(code, 'articlesPage.title').trim();
    if (fromArticles && fromArticles !== 'articlesPage.title') {
      return fromArticles;
    }
  }
  if (section === 'portfolio') {
    const fromPortfolio = translateApp(code, 'portfolioPage.title').trim();
    if (fromPortfolio && fromPortfolio !== 'portfolioPage.title') {
      return fromPortfolio;
    }
  }

  return STATIC_LABELS[code]?.[section] ?? STATIC_LABELS.en[section];
}
