import { getConfig } from '~/lib/config';
import type { PublicBrandingState } from '~/lib/marketing/public-shell';

/** Internal Qwik dashboard label — not a public marketing site name. */
const INTERNAL_DASHBOARD_LABEL = 'Dashboard';

function configuredPublicSiteName(): string {
  const fromConfig = getConfig().branding.name?.trim();
  if (fromConfig && fromConfig !== INTERNAL_DASHBOARD_LABEL) {
    return fromConfig;
  }
  const fromEnv = import.meta.env.VITE_APP_NAME;
  if (typeof fromEnv === 'string') {
    const trimmed = fromEnv.trim();
    if (trimmed && trimmed !== INTERNAL_DASHBOARD_LABEL) {
      return trimmed;
    }
  }
  return fromConfig || INTERNAL_DASHBOARD_LABEL;
}

/** Localized site name for document head (falls back to VITE branding). */
export function publicSiteName(branding?: PublicBrandingState | null): string {
  const fromApi = branding?.name?.trim();
  if (fromApi && fromApi !== INTERNAL_DASHBOARD_LABEL) {
    return fromApi;
  }
  return configuredPublicSiteName();
}

/** Localized meta description when API provides site_description on branding payload. */
export function publicSiteDescription(
  branding?: PublicBrandingState | null,
  fallback = '',
): string {
  const fromApi = branding?.site_description?.trim();
  if (fromApi) {
    return fromApi;
  }
  return fallback;
}

/** `Page title | Site name` using localized branding from the public shell. */
export function publicPageTitle(page: string, branding?: PublicBrandingState | null): string {
  return `${page} | ${publicSiteName(branding)}`;
}

/** Homepage `<title>` — site name first, then positioning line. */
export function publicHomeTitle(branding?: PublicBrandingState | null): string {
  return `${publicSiteName(branding)} | Web, Android & iOS Development`;
}
