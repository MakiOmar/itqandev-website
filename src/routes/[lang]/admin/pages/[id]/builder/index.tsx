import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { PageBuilderWorkspace } from '../../../../../../components/admin/pages/PageBuilderWorkspace';
import { useTranslate, translateApp } from '../../../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../../../lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../../layout';
import { runPageUpdateFromBrowser } from '../../../../../../lib/admin/page-actions';
import { adminApiClient } from '../../../../../../lib/admin/admin-api-client';
import { API_ENDPOINTS } from '../../../../../../lib/api/endpoints';
import { adminPageEditHref, useAppRoutes } from '../../../../../../lib/constants/routes';
import { fetchAppearanceRegistriesFromBrowser } from '../../../../../../lib/admin/appearance-actions';
import type { AppearanceRegistryEntry, PageSectionNode } from '../../../../../../lib/marketing/appearance-types';
import type { AdminPage } from '../../../../../../types/page';
import { primaryLocaleForContent } from '../../../../../../lib/content-display-locale';

function mapPageFromApi(raw: Record<string, unknown>): AdminPage {
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    excerpt: (raw.excerpt as string | null) ?? '',
    status: String(raw.status ?? 'draft'),
    content_locale: (raw.content_locale as string | null) ?? null,
    published_at: (raw.published_at as string | null) ?? null,
    sections: Array.isArray(raw.sections) ? (raw.sections as PageSectionNode[]) : [],
    translations: Array.isArray(raw.translations)
      ? (raw.translations as AdminPage['translations'])
      : [],
  };
}

export const usePageBuilderData = routeLoader$(async ({ params, cookie, request, fail }) => {
  if (params.id === 'new') {
    return fail(404, { message: 'Not found' });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return fail(404, { message: 'Not found' });
  }
  try {
    const api = adminApiClient(cookie, request, params.lang);
    const res = await api.get(API_ENDPOINTS.PAGES.GET(id));
    const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
    return mapPageFromApi(body);
  } catch {
    return fail(404, { message: 'Page not found' });
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const { success, error: showError } = useSwal();
  const langConfig = usePublicSiteMeta();
  const pageLoader = usePageBuilderData();
  const page = pageLoader.value as AdminPage;

  const sections = useSignal<PageSectionNode[]>(page.sections || []);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const activeLocale = useSignal(langConfig.value.default_locale || 'en');
  const saving = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const regs = await fetchAppearanceRegistriesFromBrowser();
      registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? regs.homepage_sections ?? [])];
    } catch {
      registry.value = [];
    }
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const siteDef = langConfig.value.default_locale || 'en';
      const effectivePrimary = primaryLocaleForContent(
        langConfig.value.site_languages,
        siteDef,
        page.content_locale,
      );
      const result = await runPageUpdateFromBrowser(page.id, {
        title: page.title,
        slug: page.slug,
        excerpt: page.excerpt || '',
        status: page.status === 'published' ? 'published' : 'draft',
        content_locale: page.content_locale || '',
        editing_locale: effectivePrimary,
        effective_primary_locale: effectivePrimary,
        canonical_title: page.title,
        canonical_excerpt: page.excerpt || '',
        persist_sections: true,
        sections_json: JSON.stringify(sections.value),
        translations_json: JSON.stringify(page.translations || []),
      });
      if (result.success) {
        await success(translateApp(lang, 'common.updated'));
      } else {
        await showError(result.error || translateApp(lang, 'common.error'));
      }
    } finally {
      saving.value = false;
    }
  });

  return (
    <PageBuilderWorkspace
      lang={lang}
      pageTitle={page.title}
      classicEditHref={adminPageEditHref(lang, page.id)}
      breadcrumbs={[
        { label: translateApp(lang, 'pages.title'), href: R.ADMIN.PAGES },
        { label: page.title || `#${page.id}`, href: adminPageEditHref(lang, page.id) },
        { label: translateApp(lang, 'pages.builderTitle') },
      ]}
      sections={sections}
      registry={registry}
      siteLanguages={langConfig.value.site_languages || []}
      defaultLocale={langConfig.value.default_locale || 'en'}
      activeLocale={activeLocale}
      onSave$={handleSave$}
      saving={saving}
    />
  );
});

export const head: DocumentHead = {
  title: 'Page Builder - Dashboard',
  meta: [
    { name: 'description', content: 'Fullscreen CMS page layout builder' },
    { name: 'robots', content: 'noindex, nofollow' },
  ],
};
