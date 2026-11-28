/**
 * WHAT IS THIS FILE?
 *
 * SSR entry point, in all cases the application is rendered outside the browser, this
 * entry point will be the common one.
 *
 * - Server (express, cloudflare...)
 * - npm run start
 * - npm run preview
 * - npm run build
 *
 */
import {
  renderToStream,
  type RenderToStreamOptions,
} from "@builder.io/qwik/server";
import Root from "./root";
import { speakConfig } from "./lib/i18n/config";
import { isSupportedUiLocale, isUiLocaleRtl } from "./lib/i18n/ui-locale-segments";
import { uiLangFromUrlPathname } from "./lib/i18n/ui-locale-path";

/** Locale for `<html lang>` / `dir` on the first SSR byte (before client bootstrap). */
function ssrDocumentLocale(opts: RenderToStreamOptions): string {
  const fromSpeak = String(opts.serverData?.locale ?? "")
    .trim()
    .toLowerCase();
  if (fromSpeak && isSupportedUiLocale(fromSpeak)) {
    return fromSpeak;
  }
  const url = opts.serverData?.url;
  if (typeof url === "string" && url.trim() !== "") {
    try {
      return uiLangFromUrlPathname(new URL(url).pathname);
    } catch {
      /* malformed serverData.url */
    }
  }
  return speakConfig.defaultLocale.lang;
}

export default function (opts: RenderToStreamOptions) {
  const lang = ssrDocumentLocale(opts);
  return renderToStream(<Root />, {
    ...opts,
    // Use container attributes to set attributes on the html tag.
    // Derived lang/dir must win over qwik-city defaults (and the old hardcoded en-us).
    containerAttributes: {
      ...opts.containerAttributes,
      lang,
      dir: isUiLocaleRtl(lang) ? "rtl" : "ltr",
    },
    serverData: {
      ...opts.serverData,
    },
  });
}
