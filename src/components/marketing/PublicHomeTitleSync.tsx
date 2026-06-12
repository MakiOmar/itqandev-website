import { component$, useVisibleTask$, type Signal } from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import { stripUiLocaleFromPathname } from '~/lib/i18n/ui-locale-path';
import { publicHomeTitle } from '~/lib/marketing/public-page-head';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';

/**
 * Keeps the homepage document title aligned with hydrated public branding.
 * Dev SSR often uses the internal "Dashboard" fallback before the browser shell fetch runs.
 */
export const PublicHomeTitleSync = component$<{ branding: Signal<PublicBrandingState> }>((props) => {
  const loc = useLocation();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => loc.url.pathname);
    track(() => props.branding.value.name);

    const logical = stripUiLocaleFromPathname(loc.url.pathname);
    if (logical !== '/' && logical !== '') {
      return;
    }

    const nextTitle = publicHomeTitle(props.branding.value);
    if (typeof document !== 'undefined' && document.title !== nextTitle) {
      document.title = nextTitle;
    }
  });

  return null;
});
