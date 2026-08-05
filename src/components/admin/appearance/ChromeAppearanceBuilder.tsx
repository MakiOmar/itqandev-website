/**
 * Shared fullscreen layout builder for Appearance → Header / Footer.
 */
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { PageBuilderWorkspace } from '~/components/admin/pages/PageBuilderWorkspace';
import { usePublicSiteMeta } from '../../../routes/[lang]/admin/layout';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchAppearanceRegistriesFromBrowser,
  fetchFooterBuilderFromBrowser,
  fetchHeaderBuilderFromBrowser,
  formatAppearanceError,
  saveFooterBuilderFromBrowser,
  saveHeaderBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import { ensurePageLayoutBands } from '~/lib/admin/page-layout';
import type { AppearanceRegistryEntry, PageSectionNode } from '~/lib/marketing/appearance-types';

export type ChromeBuilderKind = 'header' | 'footer';

const HEADER_CATEGORIES = new Set(['Header']);
const FOOTER_CATEGORIES = new Set(['Footer']);

export const ChromeAppearanceBuilder = component$<{ kind: ChromeBuilderKind }>(({ kind }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const langConfig = usePublicSiteMeta();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const defaultLocale = (
    langConfig.value.content_editing_locale ||
    langConfig.value.default_locale ||
    'en'
  ).toLowerCase();
  const activeLocale = useSignal(defaultLocale);
  const pageTitle =
    kind === 'header'
      ? translateApp(lang, 'sidebar.appearanceHeader')
      : translateApp(lang, 'sidebar.appearanceFooter');

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [regs, doc] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        kind === 'header' ? fetchHeaderBuilderFromBrowser() : fetchFooterBuilderFromBrowser(),
      ]);
      const allow = kind === 'header' ? HEADER_CATEGORIES : FOOTER_CATEGORIES;
      registry.value = (regs.kits ?? []).filter((k) => allow.has(String(k.category || '')));
      sections.value = ensurePageLayoutBands(doc.sections || []);
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'common.error')),
      });
    } finally {
      loading.value = false;
    }
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const payload = { sections: sections.value };
      const res =
        kind === 'header'
          ? await saveHeaderBuilderFromBrowser(payload)
          : await saveFooterBuilderFromBrowser(payload);
      if (!res.success) {
        showError(translateApp(lang, 'common.error'), { text: res.error || '' });
        return;
      }
      if (res.data?.sections) {
        sections.value = ensurePageLayoutBands(res.data.sections);
      }
      showSuccess(res.message || translateApp(lang, 'common.saved'));
    } finally {
      saving.value = false;
    }
  });

  if (loading.value) {
    return (
      <div class="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        {translateApp(lang, 'common.loading')}
      </div>
    );
  }

  return (
    <PageBuilderWorkspace
      lang={lang}
      pageTitle={pageTitle}
      classicEditHref={R.ADMIN.APPEARANCE_HOMEPAGE}
      breadcrumbs={[
        { label: translateApp(lang, 'sidebar.appearance'), href: R.ADMIN.APPEARANCE_HOMEPAGE },
        { label: pageTitle },
      ]}
      sections={sections}
      registry={registry}
      siteLanguages={langConfig.value.site_languages || []}
      defaultLocale={defaultLocale}
      activeLocale={activeLocale}
      onSave$={handleSave$}
      saving={saving}
    />
  );
});
