/**
 * Server-only outage handling for public pages: when Laravel cannot deliver the public shell,
 * answer with a translated 503 page instead of rendering bundled placeholder content.
 */

import type { RequestEvent, RequestEventCommon } from '@builder.io/qwik-city';
import { uiLocaleFromPublicRoute } from '~/lib/i18n/ui-locale-path';
import { isUiLocaleRtl } from '~/lib/i18n/ui-locale-segments';
import { speakConfig } from '~/lib/i18n/config';
import { fetchPublicShell, PublicBackendUnavailableError, type PublicShellState } from './public-shell';

type UnavailableStrings = {
  title: string;
  heading: string;
  message: string;
  retry: string;
  code: string;
};

const SHELL_SHARED_KEY = 'credocode.publicShell';
/** Seconds browsers and crawlers should wait before retrying. */
const RETRY_AFTER_SECONDS = 60;

const FALLBACK_STRINGS: UnavailableStrings = {
  title: 'Temporarily unavailable',
  heading: "We'll be right back",
  message: "We can't reach our servers right now. This is usually temporary, please try again in a moment.",
  retry: 'Try again',
  code: 'Error 503',
};

const localeBundles = import.meta.glob<UnavailableStrings>('../../i18n/*.json', {
  import: 'serviceUnavailable',
});

async function loadStrings(lang: string): Promise<UnavailableStrings> {
  const candidates = [lang, speakConfig.defaultLocale.lang];
  for (const code of candidates) {
    const load = localeBundles[`../../i18n/${code}.json`];
    if (!load) continue;
    try {
      const strings = await load();
      if (strings && typeof strings === 'object') {
        return { ...FALLBACK_STRINGS, ...strings };
      }
    } catch {
      // Missing or malformed bundle: try the next locale.
    }
  }
  return FALLBACK_STRINGS;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Page URL to reload; client navigations request `<route>/q-data.json`. */
function retryHref(url: URL): string {
  const path = url.pathname.replace(/\/q-data\.json$/i, '/') || '/';
  return `${path}${url.search}`;
}

export function renderBackendUnavailableHtml(opts: {
  lang: string;
  rtl: boolean;
  retryHref: string;
  strings: UnavailableStrings;
}): string {
  const s = opts.strings;
  const e = escapeHtml;
  return `<!DOCTYPE html>
<html lang="${e(opts.lang)}" dir="${opts.rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>${e(s.title)}</title>
<style>
:root{color-scheme:light dark;--bg:#f8fafc;--card:#fff;--text:#0f172a;--muted:#475569;--accent:#0389a1;--border:#e2e8f0}
@media (prefers-color-scheme:dark){:root{--bg:#0f172a;--card:#1e293b;--text:#f1f5f9;--muted:#94a3b8;--accent:#22b8cf;--border:#334155}}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1.5rem;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;line-height:1.6}
main{width:100%;max-width:32rem;padding:2.5rem 2rem;text-align:center;background:var(--card);border:1px solid var(--border);border-radius:1rem;box-shadow:0 10px 30px rgba(15,23,42,.08)}
.icon{width:3.5rem;height:3.5rem;margin:0 auto 1.25rem;color:var(--accent)}
h1{margin:0 0 .75rem;font-size:1.5rem;line-height:1.3}
p{margin:0;color:var(--muted)}
a.retry{display:inline-block;margin-top:1.75rem;padding:.7rem 1.5rem;border-radius:.6rem;background:var(--accent);color:#fff;font-weight:600;text-decoration:none}
a.retry:hover{filter:brightness(1.08)}
a.retry:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.code{margin-top:1.5rem;font-size:.75rem;letter-spacing:.05em;text-transform:uppercase}
</style>
</head>
<body>
<!-- Outage notice: shown instead of placeholder content while the API is unreachable -->
<main role="alert" aria-live="polite">
<!-- Disconnected cloud icon (inline, no external requests) -->
<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 18a4.5 4.5 0 0 1-.9-8.91A6 6 0 0 1 17.7 8.1 4.5 4.5 0 0 1 17 18"/><path d="m3 3 18 18"/></svg>
<h1>${e(s.heading)}</h1>
<p>${e(s.message)}</p>
<!-- Plain link reload so retrying works without JavaScript -->
<a class="retry" href="${e(opts.retryHref)}">${e(s.retry)}</a>
<p class="code">${e(s.code)}</p>
</main>
</body>
</html>`;
}

/** Sends the 503 outage page and aborts the remaining handlers (loaders, render). */
export async function respondBackendUnavailable(ev: RequestEventCommon, uiLocale: string | null | undefined) {
  const lang = String(uiLocale || speakConfig.defaultLocale.lang).toLowerCase();
  const html = renderBackendUnavailableHtml({
    lang,
    rtl: isUiLocaleRtl(lang),
    retryHref: retryHref(ev.url),
    strings: await loadStrings(lang),
  });
  ev.headers.set('Cache-Control', 'no-store');
  ev.headers.set('Retry-After', String(RETRY_AFTER_SECONDS));
  ev.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return ev.html(503, html);
}

function publicUiLocale(ev: RequestEventCommon): string | undefined {
  const cookie = ev.request.headers.get('cookie') || '';
  return uiLocaleFromPublicRoute(cookie, ev.params.lang, ev.request.url);
}

/**
 * `onRequest` guard for public route trees: loads the shell once before any loader runs,
 * shares it with `readGuardedPublicShell`, and answers 503 when the backend is down.
 */
export async function guardPublicShell(ev: RequestEvent, themeContext?: string): Promise<void> {
  const uiLocale = publicUiLocale(ev);
  try {
    const shell = await fetchPublicShell(uiLocale, {
      forwardDocumentUrl: ev.request.url,
      ...(themeContext ? { themeContext } : {}),
    });
    ev.sharedMap.set(SHELL_SHARED_KEY, shell);
  } catch (e) {
    if (!(e instanceof PublicBackendUnavailableError)) throw e;
    console.error('[marketing] public backend unavailable, serving 503:', ev.url.pathname, e.cause ?? e);
    throw await respondBackendUnavailable(ev, uiLocale);
  }
}

/** Shell loaded by `guardPublicShell`; fetched again only if the guard did not run. */
export async function readGuardedPublicShell(
  ev: RequestEventCommon,
  themeContext?: string,
): Promise<PublicShellState> {
  const cached = ev.sharedMap.get(SHELL_SHARED_KEY) as PublicShellState | undefined;
  if (cached) return cached;
  const uiLocale = publicUiLocale(ev);
  try {
    return await fetchPublicShell(uiLocale, {
      forwardDocumentUrl: ev.request.url,
      ...(themeContext ? { themeContext } : {}),
    });
  } catch (e) {
    if (!(e instanceof PublicBackendUnavailableError)) throw e;
    throw await respondBackendUnavailable(ev, uiLocale);
  }
}
