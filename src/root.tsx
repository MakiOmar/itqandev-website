import { component$, createContextId, isDev, useContext, useContextProvider, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet, useLocation } from "@builder.io/qwik-city";
import { useQwikSpeak, useSpeakLocale } from "qwik-speak";
import { RouterHead } from "./components/router-head/router-head";
import { DarkModeToggle } from "./components/common/DarkModeToggle";
import { speakConfig } from "./lib/i18n/config";
import { translationFn } from "./lib/i18n/translation-fn";
import { stripUiLocaleFromPathname, uiLangPrefixFromPathname } from "./lib/i18n/ui-locale-path";
import { persistPreferredLocale } from "./lib/i18n/preferred-locale-persist";

import "./global.css";

/** Body lang/dir signals updated from inside QwikCityProvider (useLocation is invalid on the root component). */
const rootBodyLocaleContext = createContextId<{
  bodyLang: ReturnType<typeof useSignal<string>>;
  bodyDir: ReturnType<typeof useSignal<"rtl" | "ltr">>;
}>("root-body-locale");

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

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => locale.lang);
    track(() => location.url.href);
    ensureLocaleFont(normalizeLocale(locale.lang));
  });

  return null;
});

/**
 * Syncs URL `/en`/`/ar` prefix to qwik-speak locale, storage, DOM, and root body signals.
 * Must run under QwikCityProvider (useLocation).
 */
const UrlLocaleBodySync = component$(() => {
  const location = useLocation();
  const locale = useSpeakLocale();
  const { bodyLang, bodyDir } = useContext(rootBodyLocaleContext);
  const speakCodes = new Set(speakConfig.supportedLocales.map((l) => l.lang.toLowerCase()));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => location.url.pathname);
    track(() => locale.lang);

    const urlLang = uiLangPrefixFromPathname(location.url.pathname);
    if (urlLang != null && speakCodes.has(urlLang)) {
      const isRtl = urlLang === "ar";
      locale.lang = urlLang;
      bodyLang.value = urlLang;
      bodyDir.value = isRtl ? "rtl" : "ltr";
      persistPreferredLocale(urlLang, isRtl);
      ensureLocaleFont(normalizeLocale(urlLang));
      if (typeof document !== "undefined") {
        if (document.body) {
          document.body.setAttribute("lang", urlLang);
          document.body.setAttribute("dir", bodyDir.value);
        }
        document.documentElement.setAttribute("lang", urlLang);
        document.documentElement.setAttribute("dir", bodyDir.value);
      }
      return;
    }

    if (typeof localStorage !== "undefined") {
      const savedLocale = localStorage.getItem("preferred-locale");
      const normalized = savedLocale?.trim().toLowerCase() ?? "";
      const rtlStored = localStorage.getItem("preferred-locale-rtl");
      const isRtl = rtlStored === "1" || (rtlStored !== "0" && normalized === "ar");
      if (normalized && speakCodes.has(normalized)) {
        locale.lang = normalized;
        bodyLang.value = normalized;
        bodyDir.value = isRtl ? "rtl" : "ltr";
      }
      ensureLocaleFont(normalizeLocale(savedLocale ?? locale.lang));
    }

    const currentLang = normalizeLocale(locale.lang);
    bodyLang.value = currentLang;
    bodyDir.value = currentLang === "ar" ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      if (document.body) {
        document.body.setAttribute("lang", currentLang);
        document.body.setAttribute("dir", bodyDir.value);
      }
      document.documentElement.setAttribute("lang", currentLang);
      document.documentElement.setAttribute("dir", bodyDir.value);
    }
    ensureLocaleFont(currentLang);
  });

  return null;
});

export default component$(() => {
  /**
   * The root of a QwikCity site always start with the <QwikCityProvider> component,
   * immediately followed by the document's <head> and <body>.
   *
   * Don't remove the `<head>` and `<body>` elements.
   * Do not call useLocation() here — Qwik City context exists only inside QwikCityProvider.
   */

  // Initialize qwik-speak
  useQwikSpeak({
    config: speakConfig,
    translationFn: translationFn,
  });

  const locale = useSpeakLocale();
  const bodyLang = useSignal(locale.lang || speakConfig.defaultLocale.lang);
  const bodyDir = useSignal((locale.lang || speakConfig.defaultLocale.lang) === "ar" ? "rtl" : "ltr");

  useContextProvider(rootBodyLocaleContext, { bodyLang, bodyDir });

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
          <UrlLocaleBodySync />
          <BodyRenderCompleteGuard />
          <LocaleFontSync />
          <RouterOutlet />
          <DarkModeToggle />
        </body>
      </QwikCityProvider>
    </>
  );
});
