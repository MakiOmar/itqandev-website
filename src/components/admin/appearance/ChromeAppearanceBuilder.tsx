/**
 * Shared fullscreen layout builder for Appearance → Header / Footer / Body (by layout id).
 */
import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { PageBuilderWorkspace } from '~/components/admin/pages/PageBuilderWorkspace';
import { usePublicSiteMeta } from '../../../routes/[lang]/admin/layout';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminChromeEditHref,
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
import type { BuilderDynamicTag } from '~/components/admin/appearance/BuilderDynamicTagChips';
import { ADMIN_NATIVE_SELECT_COMPACT_CLASS } from '~/lib/admin/native-select-classes';

function chromeKindSlug(kind: ChromeLayoutKind): string {
  if (kind === 'header') return 'headers';
  if (kind === 'footer') return 'footers';
  if (kind === 'body') return 'bodies';
  if (kind === 'single') return 'singles';
  if (kind === 'archive') return 'archives';
  if (kind === 'loop_item') return 'loop-items';
  if (kind === 'overlay') return 'overlays';
  return 'headers';
}

const HEADER_CATEGORIES = new Set(['Header']);
const FOOTER_CATEGORIES = new Set(['Footer']);

type ChromeAppearanceBuilderProps = {
  kind: ChromeLayoutKind;
  layoutId: number;
};

type PreviewRecordOption = { id: number; title: string };

type PreviewBrandingState = {
  name: string;
  logo: string;
  logoDark: string;
  logoLight: string;
};

export const ChromeAppearanceBuilder = component$<ChromeAppearanceBuilderProps>(({ kind, layoutId }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const langConfig = usePublicSiteMeta();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const layoutName = useSignal('');
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const dynamicTags = useSignal<BuilderDynamicTag[]>([]);
  const previewType = useSignal('blog_post');
  const previewRecordId = useSignal('');
  const previewRecords = useSignal<PreviewRecordOption[]>([]);
  const previewOverride = useSignal<PageSectionNode[] | null>(null);
  const previewBranding = useSignal<PreviewBrandingState>({
    name: '',
    logo: '',
    logoDark: '',
    logoLight: '',
  });
  const defaultLocale = (
    langConfig.value.content_editing_locale ||
    langConfig.value.default_locale ||
    'en'
  ).toLowerCase();
  const activeLocale = useSignal(defaultLocale);
  const pageTitle =
    kind === 'header'
      ? translateApp(lang, 'sidebar.appearanceHeader')
      : kind === 'footer'
        ? translateApp(lang, 'sidebar.appearanceFooter')
        : kind === 'single'
          ? translateApp(lang, 'sidebar.appearanceSingles')
          : kind === 'archive'
            ? translateApp(lang, 'sidebar.appearanceArchives')
            : kind === 'loop_item'
              ? translateApp(lang, 'sidebar.appearanceLoopItems')
              : kind === 'overlay'
                ? translateApp(lang, 'sidebar.appearanceOverlays')
                : translateApp(lang, 'sidebar.appearanceBody');
  const listHref =
    kind === 'header'
      ? R.ADMIN.APPEARANCE_HEADER
      : kind === 'footer'
        ? R.ADMIN.APPEARANCE_FOOTER
        : kind === 'single'
          ? R.ADMIN.APPEARANCE_SINGLES
          : kind === 'archive'
            ? R.ADMIN.APPEARANCE_ARCHIVES
            : kind === 'loop_item'
              ? R.ADMIN.APPEARANCE_LOOP_ITEMS
              : kind === 'overlay'
                ? R.ADMIN.APPEARANCE_OVERLAYS
                : R.ADMIN.APPEARANCE_BODY;
  const classicHref = adminChromeEditHref(lang, kind, layoutId);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const [regs, layout, settingsRes] = await Promise.all([
        fetchAppearanceRegistriesFromBrowser(),
        fetchChromeLayoutFromBrowser(kind, layoutId),
        getApiClient(null)
          .get(API_ENDPOINTS.SETTINGS.GET)
          .catch(() => null),
      ]);
      if (kind === 'header') {
        registry.value = (regs.kits ?? []).filter((k) => HEADER_CATEGORIES.has(String(k.category || '')));
      } else if (kind === 'footer') {
        registry.value = (regs.kits ?? []).filter((k) => FOOTER_CATEGORIES.has(String(k.category || '')));
      } else {
        registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? [])].filter(
          (k) => !HEADER_CATEGORIES.has(String(k.category || '')) && !FOOTER_CATEGORIES.has(String(k.category || '')),
        );
      }
      layoutName.value = layout.name;
      sections.value = ensurePageLayoutBands((layout.sections || []) as PageSectionNode[]);
      dynamicTags.value = regs.dynamic_tags ?? [];

      const settingsPayload =
        (settingsRes as { data?: Record<string, unknown> } | null)?.data ??
        (settingsRes as Record<string, unknown> | null) ??
        {};
      const mapped = mapPublicBrandingFromApi(
        settingsPayload,
        String(settingsPayload.site_name || settingsPayload.name || layout.name || 'Preview'),
      );
      previewBranding.value = mapped;
      if (kind === 'single' || kind === 'archive' || kind === 'loop_item') {
        // Prefill preview-as records for the default content type.
        const api = getApiClient(null);
        const res = await api.get(API_ENDPOINTS.BLOG.LIST).catch(() => null);
        const rows = res && Array.isArray((res as { data?: unknown }).data)
          ? ((res as { data: unknown[] }).data)
          : [];
        previewRecords.value = rows.slice(0, 50).map((row) => {
          const r = row as Record<string, unknown>;
          return { id: Number(r.id), title: String(r.title || r.name || r.id) };
        });
      }
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'common.error')),
      });
    } finally {
      loading.value = false;
    }
  });

  const loadPreviewRecords$ = $(async (type: string) => {
    previewType.value = type;
    previewRecordId.value = '';
    try {
      const api = getApiClient(null);
      const endpoint =
        type === 'project'
          ? API_ENDPOINTS.PROJECTS.LIST
          : type === 'service'
            ? API_ENDPOINTS.SERVICES.LIST
            : type === 'page'
              ? API_ENDPOINTS.PAGES.LIST
              : API_ENDPOINTS.BLOG.LIST;
      const res = await api.get(endpoint);
      const rows = Array.isArray((res as { data?: unknown }).data)
        ? ((res as { data: unknown[] }).data)
        : Array.isArray(res)
          ? res
          : [];
      previewRecords.value = rows.slice(0, 50).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: Number(r.id),
          title: String(r.title || r.name || r.id),
        };
      });
    } catch {
      previewRecords.value = [];
    }
  });

  const applyPreviewAs$ = $(async () => {
    const id = Number(previewRecordId.value);
    if (!Number.isInteger(id) || id < 1) return;
    try {
      const api = getApiClient(null);
      const qs = `?content_type=${encodeURIComponent(previewType.value)}&record_id=${id}`;
      const res = await api.get(`${API_ENDPOINTS.APPEARANCE.PREVIEW_AS(chromeKindSlug(kind), layoutId)}${qs}`);
      const body = ((res as { data?: unknown })?.data ?? res) as { sections?: PageSectionNode[] };
      if (Array.isArray(body.sections)) {
        previewOverride.value = ensurePageLayoutBands(body.sections);
      }
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'common.error')),
      });
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
    <div class="flex h-full min-h-0 flex-col">
      {kind === 'single' || kind === 'archive' || kind === 'loop_item' ? (
        <div class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-slate-50 px-4 py-2 text-xs dark:border-gray-800 dark:bg-slate-950">
          <span>{translateApp(lang, 'pages.previewAs')}</span>
          <select
            class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
            value={previewType.value}
            onChange$={(e) => {
              void loadPreviewRecords$((e.target as HTMLSelectElement).value);
            }}
          >
            <option value="blog_post">Blog</option>
            <option value="project">Project</option>
            <option value="service">Service</option>
            <option value="page">Page</option>
          </select>
          <select
            class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
            value={previewRecordId.value}
            onChange$={(e) => {
              previewRecordId.value = (e.target as HTMLSelectElement).value;
            }}
          >
            <option value="">—</option>
            {previewRecords.value.map((row) => (
              <option key={row.id} value={String(row.id)}>
                {row.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            class="rounded border border-gray-300 px-2 py-1 dark:border-gray-600"
            onClick$={applyPreviewAs$}
          >
            {translateApp(lang, 'pages.applyPreview')}
          </button>
        </div>
      ) : null}
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
      previewSurface={kind === 'header' || kind === 'footer' ? 'chrome' : 'page'}
      exportBuilderKind={kind}
      previewBranding={previewBranding.value}
      dynamicTags={dynamicTags.value}
      livePreviewOverride={previewOverride}
    />
    </div>
  );
});
