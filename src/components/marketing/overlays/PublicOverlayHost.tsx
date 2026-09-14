import { component$, useSignal, useVisibleTask$, $, lazy$ } from '@builder.io/qwik';
import { marketingGet } from '~/lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '~/lib/marketing/endpoints';
import { isFeatureModuleEnabled } from '~/lib/api/project-settings';
import type { PageSectionNode } from '~/lib/marketing/appearance-types';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';
import type { CaseStudy, Testimonial, BlogPost, Service, ContactInfo } from '~/lib/marketing/types';
import type { PortfolioCategory } from '~/lib/marketing/content-layer';

const OverlaySections = lazy$(() => import('./OverlaySectionsLazy'));

export type ScheduledOverlay = {
  id: number;
  delay_ms?: number;
  once?: boolean;
  sitewide?: boolean;
};

type OverlayPayload = {
  id: number;
  sections: PageSectionNode[];
  overlay?: { delay_ms?: number; once?: boolean } | null;
  css?: string;
};

/**
 * Overlay/modal opened by `[data-overlay-id]` or a delayed sitewide CTA.
 */
export const PublicOverlayHost = component$<{
  uiLocale: string;
  branding: PublicBrandingState;
  scheduled?: ScheduledOverlay[];
  services?: Service[];
  caseStudies?: CaseStudy[];
  testimonials?: Testimonial[];
  blogPosts?: BlogPost[];
  techStack?: string[];
  portfolioCategories?: PortfolioCategory[];
  siteContact?: ContactInfo | null;
}>((props) => {
  const openId = useSignal<number | null>(null);
  const payload = useSignal<OverlayPayload | null>(null);

  const load$ = $(async (id: number, markOnce = true) => {
    if (!isFeatureModuleEnabled(props.branding.features, 'overlays')) return;
    try {
      const data = await marketingGet<OverlayPayload>(MARKETING_ENDPOINTS.overlay(id), props.uiLocale);
      if (data && Array.isArray(data.sections)) {
        payload.value = data;
        openId.value = id;
        if (markOnce && data.overlay?.once !== false) {
          try {
            localStorage.setItem(`cc-overlay-seen-${id}`, '1');
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ cleanup }) => {
    const onClick = (ev: Event) => {
      const t = ev.target as HTMLElement | null;
      const el = t?.closest?.('[data-overlay-id]') as HTMLElement | null;
      if (!el) return;
      const id = Number(el.getAttribute('data-overlay-id'));
      if (!Number.isInteger(id) || id < 1) return;
      ev.preventDefault();
      load$(id);
    };
    document.addEventListener('click', onClick);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        openId.value = null;
      }
    };
    document.addEventListener('keydown', onKey);

    const timers: number[] = [];
    for (const row of props.scheduled || []) {
      if (!row.sitewide && !(row.delay_ms && row.delay_ms > 0)) continue;
      if (row.once !== false) {
        try {
          if (localStorage.getItem(`cc-overlay-seen-${row.id}`) === '1') continue;
        } catch {
          /* ignore */
        }
      }
      const delay = Math.max(0, Number(row.delay_ms) || 0);
      timers.push(
        window.setTimeout(() => {
          void load$(row.id);
        }, delay),
      );
    }

    cleanup(() => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      timers.forEach((t) => window.clearTimeout(t));
    });
  });

  if (!openId.value || !payload.value) {
    return null;
  }

  return (
    <div
      class="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      {payload.value.css ? <style dangerouslySetInnerHTML={payload.value.css} /> : null}
      <div class="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-900">
        <button
          type="button"
          class="absolute end-3 top-3 rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-600"
          onClick$={() => {
            openId.value = null;
          }}
        >
          Close
        </button>
        <OverlaySections
          sections={payload.value.sections}
          layoutAware={true}
          allowDefaultSections={false}
          uiLocale={props.uiLocale}
          branding={props.branding}
          services={props.services ?? []}
          caseStudies={props.caseStudies ?? []}
          testimonials={props.testimonials ?? []}
          blogPosts={props.blogPosts ?? []}
          techStack={props.techStack ?? []}
          portfolioCategories={props.portfolioCategories}
          siteContact={props.siteContact}
        />
      </div>
    </div>
  );
});
