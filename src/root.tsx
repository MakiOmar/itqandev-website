import { component$, isDev, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet, useLocation } from "@builder.io/qwik-city";
import { useQwikSpeak, useSpeakLocale } from "qwik-speak";
import { RouterHead } from "./components/router-head/router-head";
import { DarkModeToggle } from "./components/common/DarkModeToggle";
import { speakConfig } from "./lib/i18n/config";
import { translationFn } from "./lib/i18n/translation-fn";
import { stripUiLocaleFromPathname } from "./lib/i18n/ui-locale-path";

import "./global.css";

/** Paths that are public marketing pages (body should stay visible, do not strip data-render-complete). */
const PUBLIC_PATH_PREFIXES = ["/", "/services", "/work", "/about", "/pricing", "/contact", "/blog"];

function isPublicRoute(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const logical = stripUiLocaleFromPathname(normalized).replace(/\/+$/, "") || "/";
  if (logical === "/" || logical === "") return true;
  return PUBLIC_PATH_PREFIXES.some((p) => p !== "/" && logical.startsWith(p));
}

/**
 * Runs inside QwikCityProvider; keeps data-render-complete in sync so routes
 * never remain hidden after client-side transitions.
 */
const BodyRenderCompleteGuard = component$(() => {
  const location = useLocation();
  // eslint-disable-next-line qwik/no-use-visible-task -- intentional: clear body attribute only on non-public routes
  useVisibleTask$(({ track }) => {
    track(() => location.url.pathname);

    const pathname = location.url.pathname ?? "/";
    const body = document.body;
    if (!body) return;

    // Keep public pages visible and ensure admin/login/dashboard routes are never stuck hidden.
    // Some non-public transitions can drop the attribute; explicitly restore it.
    if (!body.hasAttribute("data-render-complete") || !isPublicRoute(pathname)) {
      body.setAttribute("data-render-complete", "true");
    }
  });
  return null;
});

const LOCALE_FONT_LINK_ID = "app-locale-font";
const INTER_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap";
const CAIRO_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap";

function normalizeLocale(lang: string | undefined): "en" | "ar" {
  return lang === "ar" ? "ar" : "en";
}

function ensureLocaleFont(locale: "en" | "ar") {
  if (typeof document === "undefined") {
    return;
  }

  const href = locale === "ar" ? CAIRO_FONT_HREF : INTER_FONT_HREF;
  let fontLink = document.getElementById(
    LOCALE_FONT_LINK_ID,
  ) as HTMLLinkElement | null;

  if (fontLink?.getAttribute("href") === href) {
    return;
  }

  if (!fontLink) {
    fontLink = document.createElement("link");
    fontLink.id = LOCALE_FONT_LINK_ID;
    fontLink.rel = "stylesheet";
  }

  fontLink.setAttribute("href", href);
  fontLink.media = "print";
  const activeLink = fontLink;
  activeLink.onload = () => {
    activeLink.media = "all";
  };

  if (!activeLink.parentNode) {
    document.head.appendChild(activeLink);
  }
}

const LocaleFontSync = component$(() => {
  const locale = useSpeakLocale();
  const location = useLocation();

  // Keep locale font applied across SPA navigations where head diffing can drop dynamic links.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => locale.lang);
    track(() => location.url.href);
    ensureLocaleFont(normalizeLocale(locale.lang));
  });

  return null;
});

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   */

  // Initialize qwik-speak
  useQwikSpeak({
    config: speakConfig,
    translationFn: translationFn,
  });

  // Get current locale for body lang and dir attributes
  const locale = useSpeakLocale();
  // Initialize with current locale from qwik-speak (set by onRequest handler)
  // This ensures SSR renders with correct direction from the start, matching the blocking script
  const bodyLang = useSignal(locale.lang || speakConfig.defaultLocale.lang);
  const bodyDir = useSignal(locale.lang === 'ar' ? 'rtl' : 'ltr');

  const speakCodes = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

  // Initialize locale from localStorage on client-side and sync with qwik-speak
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    if (typeof localStorage !== 'undefined') {
      const savedLocale = localStorage.getItem('preferred-locale');
      const normalized = savedLocale?.trim().toLowerCase() ?? '';
      const rtlStored = localStorage.getItem('preferred-locale-rtl');
      const isRtl =
        rtlStored === '1' || (rtlStored !== '0' && normalized === 'ar');
      if (normalized && speakCodes.has(normalized)) {
        locale.lang = normalized;
        bodyLang.value = normalized;
        bodyDir.value = isRtl ? 'rtl' : 'ltr';
      }

      ensureLocaleFont(normalizeLocale(savedLocale ?? locale.lang));
    }
  });

  // Update body lang and dir when locale changes
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const trackedLang = track(() => locale.lang);
    const currentLocale = normalizeLocale(trackedLang);
    const currentLang = currentLocale;

    bodyLang.value = currentLang;
    const rtlStored =
      typeof localStorage !== 'undefined' ? localStorage.getItem('preferred-locale-rtl') : null;
    const isRtl = rtlStored === '1' || (rtlStored !== '0' && currentLang === 'ar');
    bodyDir.value = isRtl ? 'rtl' : 'ltr';
    
    // Update document body and html attributes
    if (typeof document !== 'undefined') {
      if (document.body) {
        document.body.setAttribute('lang', currentLang);
        document.body.setAttribute('dir', bodyDir.value);
      }
      document.documentElement.setAttribute('lang', currentLang);
      document.documentElement.setAttribute('dir', bodyDir.value);
    }

    ensureLocaleFont(currentLocale);
  });

  return (
    <>
      {/* Component: Root */}
      <QwikCityProvider>
        <head>
          <meta charset="utf-8" />
          {!isDev && (
            <link
              rel="manifest"
              href={`${import.meta.env.BASE_URL}manifest.json`}
            />
          )}
          <RouterHead />
        </head>
        <body lang={bodyLang.value} dir={bodyDir.value} data-render-complete={typeof window === "undefined" ? "false" : undefined}>
          <BodyRenderCompleteGuard />
          <LocaleFontSync />
          <RouterOutlet />
          <DarkModeToggle />
        </body>
      </QwikCityProvider>
    </>
  );
});
