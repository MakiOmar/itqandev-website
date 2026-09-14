import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { PageBuilderWorkspace } from '~/components/admin/pages/PageBuilderWorkspace';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import { usePublicSiteMeta } from '../../layout';
import { getLocalizedRoutes } from '~/lib/constants/routes';
import {
  fetchAppearanceRegistriesFromBrowser,
  fetchHomepageBuilderFromBrowser,
  formatAppearanceError,
  saveHomepageBuilderFromBrowser,
} from '~/lib/admin/appearance-actions';
import { ensurePageLayoutBands } from '~/lib/admin/page-layout';
import type { AppearanceRegistryEntry, PageSectionNode } from '~/lib/marketing/appearance-types';
import type { BuilderDynamicTag } from '~/components/admin/appearance/BuilderDynamicTagChips';

/**
 * Homepage Appearance uses the same band workspace as CMS pages (legacy flat sections wrap).
 */
export default component$(() => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const langConfig = usePublicSiteMeta();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const dynamicTags = useSignal<BuilderDynamicTag[]>([]);
  const defaultLocale = (
    langConfig.value.content_editing_locale ||
    langConfig.value.default_locale ||
    'en'
  ).toLowerCase();
  const activeLocale = useSignal(defaultLocale);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [regs, home] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        fetchHomepageBuilderFromBrowser(),
      ]);
      registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? [])];
      dynamicTags.value = regs.dynamic_tags ?? [];
      sections.value = ensurePageLayoutBands((home.sections || []) as PageSectionNode[]);
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'appearance.homepageLoadFailed')),
      });
    } finally {
      loading.value = false;
    }
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const res = await saveHomepageBuilderFromBrowser(sections.value);
      if (!res.success) {
        showError(translateApp(lang, 'common.error'), { text: res.error || '' });
        return;
      }
      if (res.data?.sections) {
        sections.value = ensurePageLayoutBands(res.data.sections as PageSectionNode[]);
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
      pageTitle={translateApp(lang, 'sidebar.appearanceHomepage')}
      classicEditHref={R.ADMIN.APPEARANCE_HOMEPAGE}
      breadcrumbs={[
        { label: translateApp(lang, 'sidebar.appearance'), href: R.ADMIN.APPEARANCE_HOMEPAGE },
        { label: translateApp(lang, 'sidebar.appearanceHomepage') },
      ]}
      sections={sections}
      registry={registry}
      siteLanguages={langConfig.value.site_languages || []}
      defaultLocale={defaultLocale}
      activeLocale={activeLocale}
      onSave$={handleSave$}
      saving={saving}
      previewSurface="page"
      exportBuilderKind="homepage"
      dynamicTags={dynamicTags.value}
    />
  );
});

export const head: DocumentHead = { title: 'Homepage builder' };
