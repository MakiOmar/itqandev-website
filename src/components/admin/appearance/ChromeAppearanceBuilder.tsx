/**
 * Shared fullscreen layout builder for Appearance → Header / Footer / Body (by layout id).
 */
import { component$, useSignal, useTask$, useVisibleTask$, $ } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { useLocation } from '@builder.io/qwik-city';
import { PageBuilderWorkspace } from '~/components/admin/pages/PageBuilderWorkspace';
import {
  BUILDER_LOCALE_PARAM,
  builderPrimaryLocale,
  resolveBuilderInitialLocale,
} from '~/lib/admin/builder-locale';
import { usePublicSiteMeta } from '../../../routes/[lang]/admin/layout';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import { useSwal } from '~/lib/hooks/useSwal';
import {
  adminChromeEditHref,
  getLocalizedRoutes,
} from '~/lib/constants/routes';
import {
  EMPTY_DYNAMIC_TAG_CATALOG,
  fetchAppearanceRegistriesFromBrowser,
  formatAppearanceError,
  type DynamicTagCatalog,
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
import { dynamicTagCatalogForChromeKind, dynamicTagCatalogFromRegistries } from '~/lib/admin/builder-dynamic-tags';
import {
  CHROME_EXCLUDED_BLOCK_TYPES,
  chromeCategoryExcludedFrom,
} from '~/lib/marketing/chrome-blocks';
import type { BuilderPreviewSupport } from '~/components/admin/pages/PageBuilderCanvasBlock';
import {
  contentTypeLabel,
  fetchPreviewRecordsFromBrowser,
  type PreviewRecordOption,
} from '~/lib/admin/content-types';
import {
  pickPreviewRecordId,
  previewChromeDraftFromBrowser,
  readBuilderPreviewSource,
  writeBuilderPreviewSource,
} from '~/lib/admin/builder-preview-source';
import { BuilderPreviewSourceBar } from './BuilderPreviewSourceBar';

/** Layout kinds whose dynamic tags resolve against a record (single / archive / loop item). */
const RECORD_PREVIEW_KINDS: ReadonlySet<ChromeLayoutKind> = new Set(['single', 'archive', 'loop_item']);
/** Pause after the last edit before re-resolving the canvas with record data. */
const PREVIEW_DEBOUNCE_MS = 400;

const HEADER_CATEGORIES = new Set(['Header']);
const FOOTER_CATEGORIES = new Set(['Footer']);

type ChromeAppearanceBuilderProps = {
  kind: ChromeLayoutKind;
  layoutId: number;
  /** Live preview data for page kits (projects, testimonials, blog), as in the page builder. */
  previewSupport?: BuilderPreviewSupport;
};

type PreviewBrandingState = {
  name: string;
  logo: string;
  logoDark: string;
  logoLight: string;
};

export const ChromeAppearanceBuilder = component$<ChromeAppearanceBuilderProps>(({ kind, layoutId, previewSupport }) => {
  const { lang } = useTranslate();
  const R = getLocalizedRoutes(lang);
  const langConfig = usePublicSiteMeta();
  const { success: showSuccess, error: showError } = useSwal();
  const loading = useSignal(true);
  const saving = useSignal(false);
  const layoutName = useSignal('');
  const sections = useSignal<PageSectionNode[]>([]);
  const registry = useSignal<AppearanceRegistryEntry[]>([]);
  const dynamicTags = useSignal<DynamicTagCatalog>(EMPTY_DYNAMIC_TAG_CATALOG);
  const recordPreview = RECORD_PREVIEW_KINDS.has(kind);
  const previewTypes = useSignal<{ key: string; label: string }[]>([]);
  const previewType = useSignal('');
  /** 0 = show `{{tags}}`; otherwise the record whose data fills the canvas. */
  const previewRecordId = useSignal(0);
  const previewRecords = useSignal<PreviewRecordOption[]>([]);
  const previewOverride = useSignal<PageSectionNode[] | null>(null);
  const previewBusy = useSignal(false);
  const previewError = useSignal('');
  /** Latest resolve request; older responses are dropped. */
  const previewSeq = useSignal(0);
  const previewBranding = useSignal<PreviewBrandingState>({
    name: '',
    logo: '',
    logoDark: '',
    logoLight: '',
  });
  const loc = useLocation();
  const defaultLocale = builderPrimaryLocale(langConfig.value);
  const activeLocale = useSignal(
    resolveBuilderInitialLocale(langConfig.value, loc.url.searchParams.get(BUILDER_LOCALE_PARAM)),
  );
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

  /** Lists a type's records and selects the remembered one (else the newest). */
  const loadPreviewRecords$ = $(async (type: string, remembered: number | null) => {
    previewType.value = type;
    previewBusy.value = true;
    previewError.value = '';
    try {
      previewRecords.value = await fetchPreviewRecordsFromBrowser(type);
    } catch (e) {
      previewRecords.value = [];
      previewError.value = formatAppearanceError(e, translateApp(lang, 'pages.previewFailed'));
    } finally {
      previewBusy.value = false;
    }
    previewRecordId.value = pickPreviewRecordId(previewRecords.value, remembered);
  });

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
      if (kind === 'header' || kind === 'footer') {
        // Same widgets and kits as the page builder, minus the other surface's chrome kits.
        const otherChrome = chromeCategoryExcludedFrom(kind);
        registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? [])].filter(
          (k) => String(k.category || '') !== otherChrome && !CHROME_EXCLUDED_BLOCK_TYPES.has(k.type),
        );
      } else {
        registry.value = [...(regs.widgets ?? []), ...(regs.kits ?? [])].filter(
          (k) => !HEADER_CATEGORIES.has(String(k.category || '')) && !FOOTER_CATEGORIES.has(String(k.category || '')),
        );
      }
      layoutName.value = layout.name;
      sections.value = ensurePageLayoutBands((layout.sections || []) as PageSectionNode[]);
      dynamicTags.value = dynamicTagCatalogForChromeKind(dynamicTagCatalogFromRegistries(regs), kind);

      const settingsPayload =
        (settingsRes as { data?: Record<string, unknown> } | null)?.data ??
        (settingsRes as Record<string, unknown> | null) ??
        {};
      const mapped = mapPublicBrandingFromApi(
        settingsPayload,
        String(settingsPayload.site_name || settingsPayload.name || layout.name || 'Preview'),
      );
      previewBranding.value = mapped;
      if (recordPreview) {
        previewTypes.value = (regs.content_types ?? []).map((ct) => ({ key: ct.key, label: contentTypeLabel(lang, ct) }));
        const remembered = readBuilderPreviewSource(kind, layoutId);
        const type = previewTypes.value.some((t) => t.key === remembered?.type)
          ? (remembered?.type ?? '')
          : (previewTypes.value[0]?.key ?? '');
        if (type) await loadPreviewRecords$(type, remembered?.type === type ? remembered.recordId : null);
      }
    } catch (e) {
      showError(translateApp(lang, 'common.error'), {
        text: formatAppearanceError(e, translateApp(lang, 'common.error')),
      });
    } finally {
      loading.value = false;
    }
  });

  const selectPreviewRecord$ = $((recordId: number) => {
    previewRecordId.value = recordId;
    writeBuilderPreviewSource(kind, layoutId, { type: previewType.value, recordId });
  });

  const changePreviewType$ = $(async (type: string) => {
    await loadPreviewRecords$(type, null);
    writeBuilderPreviewSource(kind, layoutId, { type, recordId: previewRecordId.value });
  });

  // Canvas shows the unsaved layout resolved with the chosen record; re-run after edits, record or language changes.
  useTask$(({ track, cleanup }) => {
    const recordId = track(() => previewRecordId.value);
    const type = track(() => previewType.value);
    const locale = track(() => activeLocale.value);
    const current = track(() => sections.value);
    if (isServer) return;
    if (!recordPreview || recordId < 1 || !type) {
      previewOverride.value = null;
      previewError.value = '';
      return;
    }
    const seq = previewSeq.value + 1;
    previewSeq.value = seq;
    const timer = setTimeout(async () => {
      previewBusy.value = true;
      try {
        const resolved = await previewChromeDraftFromBrowser(kind, layoutId, {
          contentType: type,
          recordId,
          locale,
          sections: current,
        });
        if (seq !== previewSeq.value) return;
        previewOverride.value = resolved;
        previewError.value = '';
      } catch (e) {
        if (seq !== previewSeq.value) return;
        previewError.value = formatAppearanceError(e, translateApp(lang, 'pages.previewFailed'));
      } finally {
        if (seq === previewSeq.value) previewBusy.value = false;
      }
    }, PREVIEW_DEBOUNCE_MS);
    cleanup(() => clearTimeout(timer));
  });

  const handleSave$ = $(async () => {
    saving.value = true;
    try {
      const res = await updateChromeLayoutFromBrowser(kind, layoutId, {
        sections: sections.value,
      });
      if (!res.success) {
        showError(translateApp(lang, 'common.error'), { text: res.error || '' });
        return false;
      }
      if (res.data?.sections) {
        sections.value = ensurePageLayoutBands(res.data.sections as PageSectionNode[]);
      }
      showSuccess(res.message || translateApp(lang, 'common.saved'));
      return true;
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
      {recordPreview ? (
        <BuilderPreviewSourceBar
          lang={lang}
          types={previewTypes.value}
          type={previewType.value}
          records={previewRecords.value}
          recordId={previewRecordId.value}
          busy={previewBusy.value}
          error={previewError.value}
          onTypeChange$={changePreviewType$}
          onRecordChange$={selectPreviewRecord$}
        />
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
      previewSupport={previewSupport}
      dynamicTags={dynamicTags.value}
      livePreviewOverride={previewOverride}
    />
    </div>
  );
});
