import { isUiLocaleRtl } from '~/lib/i18n/ui-locale-segments';
import { shouldDisableGoogleFontsForPath } from '~/lib/perf/google-fonts-policy';
import type { SiteTypography, TypographyFace } from '~/types/typography';

const GOOGLE_CSS_LTR =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap';
const GOOGLE_CSS_RTL =
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap';

const FALLBACK_LTR =
  "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FALLBACK_RTL = "Cairo, 'Segoe UI', Tahoma, Arial, sans-serif";

const SOURCE_ORDER = ['woff2', 'woff', 'ttf', 'eot', 'svg'] as const;

function systemFace(ltr: boolean): TypographyFace {
  return {
    css_family: ltr ? 'Inter' : 'Cairo',
    fallback_stack: ltr ? FALLBACK_LTR : FALLBACK_RTL,
    google_css_href: ltr ? GOOGLE_CSS_LTR : GOOGLE_CSS_RTL,
    sources: {},
  };
}

/** Mirrors backend `TypographyResolver` defaults when API is unavailable. */
export function defaultSystemTypography(): SiteTypography {
  return {
    mode: 'system',
    ltr: systemFace(true),
    rtl: systemFace(false),
  };
}

function normalizeSources(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) {
      out[key] = val.trim();
    }
  }
  return out;
}

function normalizeFace(raw: unknown, fallback: TypographyFace): TypographyFace {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const o = raw as Record<string, unknown>;
  const cssFamily = typeof o.css_family === 'string' && o.css_family.trim() ? o.css_family.trim() : fallback.css_family;
  const stack =
    typeof o.fallback_stack === 'string' && o.fallback_stack.trim()
      ? o.fallback_stack.trim()
      : fallback.fallback_stack;
  const google =
    typeof o.google_css_href === 'string' && o.google_css_href.trim() ? o.google_css_href.trim() : null;

  return {
    css_family: cssFamily,
    fallback_stack: stack,
    google_css_href: google,
    sources: normalizeSources(o.sources),
  };
}

export function parseSiteTypography(raw: unknown): SiteTypography {
  const defaults = defaultSystemTypography();
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const o = raw as Record<string, unknown>;
  const mode = o.mode === 'custom' ? 'custom' : 'system';

  return {
    mode,
    ltr: normalizeFace(o.ltr, defaults.ltr),
    rtl: normalizeFace(o.rtl, defaults.rtl),
  };
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function buildFontFaceCss(typography: SiteTypography): string {
  const seenFamilies = new Set<string>();
  const blocks: string[] = [];

  for (const face of [typography.ltr, typography.rtl]) {
    const family = face.css_family?.trim();
    if (!family || seenFamilies.has(family)) {
      continue;
    }
    const sources = face.sources ?? {};
    const srcParts: string[] = [];

    for (const fmt of SOURCE_ORDER) {
      const url = sources[fmt];
      if (!url) {
        continue;
      }
      if (fmt === 'eot') {
        srcParts.push(`url('${url}');src:url('${url}?#iefix') format('embedded-opentype')`);
      } else if (fmt === 'svg') {
        srcParts.push(`url('${url}') format('svg')`);
      } else {
        srcParts.push(`url('${url}') format('${fmt}')`);
      }
    }

    if (srcParts.length === 0) {
      continue;
    }

    seenFamilies.add(family);
    blocks.push(
      `@font-face{font-family:'${escapeCssString(family)}';font-style:normal;font-weight:400;font-display:swap;src:${srcParts.join(',')};}`,
    );
  }

  return blocks.join('');
}

export function buildTypographyCssVariables(typography: SiteTypography): string {
  return `:root{--font-sans:${typography.ltr.fallback_stack};--font-arabic:${typography.rtl.fallback_stack};}html{font-family:var(--font-sans);}html[dir="rtl"],html[lang="ar"]{font-family:var(--font-arabic);}[dir="rtl"]{font-family:var(--font-arabic);}[dir="ltr"]{font-family:var(--font-sans);}`;
}

export function resolveActiveFace(typography: SiteTypography, isRtl: boolean): TypographyFace {
  return isRtl ? typography.rtl : typography.ltr;
}

export function resolveGoogleCssHref(typography: SiteTypography, isRtl: boolean): string | null {
  if (typography.mode !== 'system') {
    return null;
  }
  const href = resolveActiveFace(typography, isRtl).google_css_href;
  return href && href.trim() ? href.trim() : null;
}

/** System mode on public pages respects `VITE_DISABLE_GOOGLE_FONTS`; admin always loads. */
export function shouldLoadGoogleFonts(typography: SiteTypography, pathname: string): boolean {
  if (typography.mode !== 'system') {
    return false;
  }
  return !shouldDisableGoogleFontsForPath(pathname);
}

export function readClientTypography(): SiteTypography {
  if (typeof window === 'undefined') {
    return defaultSystemTypography();
  }
  const raw = (window as unknown as { __siteTypography?: unknown }).__siteTypography;
  return parseSiteTypography(raw);
}

export function resolveLocaleFontHref(typography: SiteTypography, locale: string): string | null {
  return resolveGoogleCssHref(typography, isUiLocaleRtl(locale));
}

/**
 * Async Google Font stylesheet injection (shared by root LocaleFontSync and inline bootstrap).
 */
export function ensureGoogleFontStylesheet(href: string | null, linkId = 'app-locale-font'): void {
  if (typeof document === 'undefined' || !href) {
    return;
  }

  try {
    if (sessionStorage.getItem('external-fonts-disabled') === '1') {
      return;
    }
  } catch {
    // ignore
  }

  let fontLink = document.getElementById(linkId) as HTMLLinkElement | null;
  if (fontLink?.getAttribute('href') === href) {
    return;
  }

  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = linkId;
    fontLink.rel = 'stylesheet';
  }

  fontLink.setAttribute('href', href);
  fontLink.media = 'print';
  const activeLink = fontLink;
  activeLink.onload = () => {
    activeLink.media = 'all';
  };
  activeLink.onerror = () => {
    try {
      sessionStorage.setItem('external-fonts-disabled', '1');
    } catch {
      // ignore
    }
    try {
      activeLink.remove();
    } catch {
      // ignore
    }
  };

  if (!activeLink.parentNode) {
    document.head.appendChild(activeLink);
  }
}

export function buildTypographyBootstrapScript(typographyJson: string): string {
  const disableExternalFonts = import.meta.env?.VITE_DISABLE_GOOGLE_FONTS === 'true';
  return `
(function() {
  var __typography = ${typographyJson};
  window.__siteTypography = __typography;
  var __uiLocales = window.__uiLocales || null;
  function isPublicRoute(logical) {
    return logical === '/' || logical === '' ||
      logical.indexOf('/services') === 0 || logical.indexOf('/work') === 0 ||
      logical.indexOf('/about') === 0 || logical.indexOf('/pricing') === 0 ||
      logical.indexOf('/contact') === 0 || logical.indexOf('/blog') === 0;
  }
  var path = (document.location.pathname || '/').replace(/\\/$/, '') || '/';
  var logical = path;
  if (__uiLocales && __uiLocales.codes && __uiLocales.codes.length) {
    var pattern = new RegExp('^/(' + __uiLocales.codes.join('|') + ')(?=/|$)', 'i');
    var m = path.match(pattern);
    if (m) logical = path.slice(m[0].length) || '/';
  }
  if (logical.charAt(0) !== '/') logical = '/' + logical;
  var isPublic = isPublicRoute(logical);
  if (__typography.mode !== 'system') return;
  if (${disableExternalFonts ? 'true' : 'false'} && isPublic) return;
  var locale = (document.documentElement.getAttribute('lang') || (__uiLocales && __uiLocales.default) || 'en').toLowerCase();
  var isRtl = __uiLocales && __uiLocales.rtl && __uiLocales.rtl[locale];
  var face = isRtl ? __typography.rtl : __typography.ltr;
  var href = face && face.google_css_href;
  if (!href) return;
  requestAnimationFrame(function() {
    var fontLinkId = 'app-locale-font';
    try { if (sessionStorage.getItem('external-fonts-disabled') === '1') return; } catch (e) {}
    var link = document.getElementById(fontLinkId);
    if (link && link.getAttribute('href') === href) return;
    if (!link) { link = document.createElement('link'); link.id = fontLinkId; link.rel = 'stylesheet'; }
    link.setAttribute('href', href);
    link.media = 'print';
    link.onload = function() { this.media = 'all'; };
    link.onerror = function() {
      try { sessionStorage.setItem('external-fonts-disabled', '1'); } catch (e) {}
      try { this.remove(); } catch (e) {}
    };
    if (!link.parentNode) document.head.appendChild(link);
  });
})();
`.trim();
}
