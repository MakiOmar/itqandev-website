import { component$, isDev, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import { QwikCityProvider, RouterOutlet } from "@builder.io/qwik-city";
import { useQwikSpeak, useSpeakLocale } from "qwik-speak";
import { RouterHead } from "./components/router-head/router-head";
import { DarkModeToggle } from "./components/common/DarkModeToggle";
import { speakConfig } from "./lib/i18n/config";
import { translationFn } from "./lib/i18n/translation-fn";

import "./global.css";

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
  const bodyDir = useSignal((locale.lang === 'ar' ? 'rtl' : 'ltr'));

  // Initialize locale from localStorage on client-side and sync with qwik-speak
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    if (typeof localStorage !== 'undefined') {
      const savedLocale = localStorage.getItem('preferred-locale');
      if (savedLocale && (savedLocale === 'en' || savedLocale === 'ar')) {
        locale.lang = savedLocale;
        bodyLang.value = savedLocale;
        bodyDir.value = savedLocale === 'ar' ? 'rtl' : 'ltr';
      }
    }
  });

  // Update body lang and dir when locale changes
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    const currentLang = track(() => locale.lang);
    
    bodyLang.value = currentLang;
    // Set direction: RTL for Arabic, LTR for English and others
    bodyDir.value = currentLang === 'ar' ? 'rtl' : 'ltr';
    
    // Update document body and html attributes
    if (typeof document !== 'undefined') {
      document.body.setAttribute('lang', currentLang);
      document.body.setAttribute('dir', bodyDir.value);
      document.documentElement.setAttribute('lang', currentLang);
      document.documentElement.setAttribute('dir', bodyDir.value);
    }
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
        <body lang={bodyLang.value} dir={bodyDir.value} data-render-complete={typeof window === 'undefined' ? 'false' : undefined}>
          {typeof window !== 'undefined' && (() => {
            // Ensure data-render-complete is not set initially on client-side
            // The blocking script will set it when ready
            if (document.body && document.body.hasAttribute('data-render-complete')) {
              document.body.removeAttribute('data-render-complete');
            }
            return null;
          })()}
          <RouterOutlet />
          <DarkModeToggle />
        </body>
      </QwikCityProvider>
    </>
  );
});
