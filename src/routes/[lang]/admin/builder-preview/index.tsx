import '~/styles/site.css';
import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { routeLoader$ } from '@builder.io/qwik-city';
import { HomepageSectionsRenderer } from '~/components/marketing/home-sections/HomepageSectionsRenderer';
import { Header } from '~/components/marketing/Header';
import { Footer } from '~/components/marketing/Footer';
import { LocaleTransitionProvider } from '~/components/common/LocaleTransitionOverlay';
import { PublicShellTypographyHead } from '~/components/perf/PublicShellTypographyHead';
import { LayoutDeviceProvider } from '~/lib/marketing/layout-device-context';
import { fetchPublicShell } from '~/lib/marketing/public-shell';
import { defaultSystemTypography } from '~/lib/perf/typography';
import {
  BUILDER_PREVIEW_DOCUMENT,
  BUILDER_PREVIEW_READY,
  isBuilderPreviewMessage,
  type BuilderPreviewPayload,
} from '~/lib/admin/builder-preview-message';
import {
  builderPageRendererProps,
  withChromeMenuSamples,
} from '~/components/admin/pages/PageBuilderCanvasBlock';

/**
 * Frontend-accurate render of an unsaved builder document, loaded in an iframe by the
 * builder "view page" mode so real mobile/tablet breakpoints apply. The document arrives
 * via same-origin postMessage; nothing is fetched or persisted from here.
 */
export const useBuilderPreviewShell = routeLoader$(async ({ params, request }) =>
  fetchPublicShell(params.lang, { forwardDocumentUrl: request.url }),
);

export const onRequest: RequestHandler = ({ headers }) => {
  headers.set('Cache-Control', 'no-store');
};

export const head: DocumentHead = {
  title: 'Builder preview',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
};

export default component$(() => {
  const shell = useBuilderPreviewShell();
  const payload = useSignal<BuilderPreviewPayload | null>(null);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      if (!isBuilderPreviewMessage(e.data) || e.data.type !== BUILDER_PREVIEW_DOCUMENT) return;
      payload.value = e.data.payload;
    };
    // Preview is read-only: keep link clicks from navigating the frame away.
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest('a[href]');
      if (link) e.preventDefault();
    };
    window.addEventListener('message', onMessage);
    document.addEventListener('click', onClick, true);
    window.parent?.postMessage({ type: BUILDER_PREVIEW_READY }, window.location.origin);
    cleanup(() => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('click', onClick, true);
    });
  });

  const s = shell.value;
  const doc = payload.value;
  if (!doc) {
    return <div class="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const chrome = doc.surface === 'chrome';
  const editedChrome = chrome ? withChromeMenuSamples(doc.bands) : [];
  const headerSections =
    chrome && doc.chromeKind === 'header' ? editedChrome : (s.header?.sections ?? []);
  const footerPayload =
    chrome && doc.chromeKind === 'footer' ? { sections: editedChrome } : s.footer;

  return (
    <div
      data-public-page
      class="relative isolate flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900/20"
    >
      <PublicShellTypographyHead typography={s.branding?.typography ?? defaultSystemTypography()} />
      <LocaleTransitionProvider>
        <LayoutDeviceProvider device={doc.device}>
          <div class="relative z-10 flex min-h-screen flex-1 flex-col">
            <Header
              branding={s.branding}
              navItems={s.primaryMenu}
              features={s.branding?.features}
              headerSections={headerSections}
            />
            <main class="min-w-0 flex-1 overflow-x-clip">
              {s.branding?.design_kit_css ? (
                <style dangerouslySetInnerHTML={s.branding.design_kit_css} />
              ) : null}
              {chrome ? (
                <div class="min-h-[50vh]" />
              ) : (
                <HomepageSectionsRenderer
                  {...builderPageRendererProps({
                    surface: 'page',
                    uiLocale: doc.uiLocale,
                    pageTitle: doc.pageTitle,
                    siteLanguages: [],
                    support: doc.support,
                    isDarkMode: false,
                  })}
                  branding={s.branding}
                  sections={doc.bands}
                  allowDefaultSections={false}
                  layoutAware={true}
                  siteContact={s.siteContent?.contact ?? null}
                />
              )}
            </main>
            <Footer contact={s.siteContent?.contact} branding={s.branding} footer={footerPayload} />
          </div>
        </LayoutDeviceProvider>
      </LocaleTransitionProvider>
    </div>
  );
});
