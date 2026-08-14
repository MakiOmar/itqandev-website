/**
 * Shared fullscreen layout builder for Appearance → Header / Footer (by layout id).
 */
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { PageBuilderWorkspace } from '~/components/admin/pages/PageBuilderWorkspace';
import { usePublicSiteMeta } from '../../../routes/[lang]/admin/layout';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminFooterEditHref,
  adminHeaderEditHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import {
  fetchAppearanceRegistriesFromBrowser,
  formatAppearanceError,
} from '~/lib/admin/appearance-actions';
import {
  fetchChromeLayoutFromBrowser,
  updateChromeLayoutFromBrowser,
} from '~/lib/admin/chrome-layout-actions';
import { ensurePageLayoutBands } from '~/lib/admin/page-layout';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import { mapPublicBrandingFromApi } from '~/lib/marketing/resolve-laravel-media-url';
import type { AppearanceRegistryEntry, PageSectionNode } from '~/lib/marketing/appearance-types';
import type { ChromeLayoutKind } from '~/types/chrome-layout';

const HEADER_CATEGORIES = new Set(['Header']);
const FOOTER_CATEGORIES = new Set(['Footer']);

export const ChromeAppearanceBuilder = component$<{
  kind: ChromeLayoutKind;
  layoutId: number;
}>(({ kind, layoutId }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const langConfig = usePublicSiteMeta();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const layoutName = useSignal('');
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const previewBranding = useSignal<{
    name: string;
    logo: string;
    logoDark: string;
    logoLight: string;
  }>({ name: '', logo: '', logoDark: '', logoLight: '' });
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
  const listHref = kind === 'header' ? R.ADMIN.APPEARANCE_HEADER : R.ADMIN.APPEARANCE_FOOTER;
  const classicHref =
    kind === 'header' ? adminHeaderEditHref(lang, layoutId) : adminFooterEditHref(lang, layoutId);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [regs, layout, settingsRes] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        fetchChromeLayoutFromBrowser(kind, layoutId),
        getApiClient(null)
          .get<Record<string, unknown>>(API_ENDPOINTS.SETTINGS.GET)
          .catch(() => null),
      ]);
      const allow = kind === 'header' ? HEADER_CATEGORIES : FOOTER_CATEGORIES;
      registry.value = (regs.kits ?? []).filter((k) => allow.has(String(k.category || '')));
      layoutName.value = layout.name;
      sections.value = ensurePageLayoutBands((layout.sections || []) as PageSectionNode[]);

      const settingsPayload =
        (settingsRes as { data?: Record<string, unknown> } | null)?.data ??
        (settingsRes as Record<string, unknown> | null) ??
        {};
      const mapped = mapPublicBrandingFromApi(
        settingsPayload,
        String(settingsPayload.site_name || settingsPayload.name || layout.name || 'Preview'),
      );
      previewBranding.value = mapped;
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
      const res = await updateChromeLayoutFromBrowser(kind, layoutId, {
        sections: sections.value,
      });
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
      pageTitle={layoutName.value || pageTitle}
      classicEditHref={classicHref}
      breadcrumbs={[
        { label: translateApp(lang, 'sidebar.appearance'), href: R.ADMIN.APPEARANCE_HOMEPAGE },
        { label: pageTitle, href: listHref },
        { label: layoutName.value || String(layoutId) },
      ]}
      sections={sections}
      registry={registry}
      siteLanguages={langConfig.value.site_languages || []}
      defaultLocale={defaultLocale}
      activeLocale={activeLocale}
      onSave$={handleSave$}
      saving={saving}
      previewSurface="chrome"
      previewBranding={previewBranding.value}
    />
  );
});
