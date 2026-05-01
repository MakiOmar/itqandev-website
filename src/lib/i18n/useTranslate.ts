import { inlineTranslate, useSpeakLocale } from 'qwik-speak';
import { isServer } from '@builder.io/qwik/build';

/** Agent debug: cap SSR logs per process to limit noise */
let __agentUseTranslateLogs = 0;

/**
 * Dashboard/UI translations via qwik-speak's inlineTranslate (Speak merge + getValue).
 * loadTranslation$ merges each asset's JSON at the root of translation[lang] (see translation-fn.ts).
 */
export function useTranslate() {
  const locale = useSpeakLocale();

  // #region agent log
  if (isServer && __agentUseTranslateLogs < 40) {
    __agentUseTranslateLogs += 1;
    const stack = new Error().stack ?? "";
    const frames = stack
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.includes("website") || l.includes("credocode"));
    fetch("http://127.0.0.1:7469/ingest/ed85bb2c-c192-44f6-8c60-9fe04360649a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "08cfc0",
      },
      body: JSON.stringify({
        sessionId: "08cfc0",
        runId: "post-fix",
        hypothesisId: "H1",
        location: "useTranslate.ts:hook",
        message: "useTranslate() invoked (SSR)",
        data: {
          n: __agentUseTranslateLogs,
          localeLang: locale.lang,
          frames: frames.slice(0, 8),
          fixAttempt: "inlineTranslate+flattenLoad",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const t = inlineTranslate();

  return {
    t,
    locale: locale.lang,
  };
}
