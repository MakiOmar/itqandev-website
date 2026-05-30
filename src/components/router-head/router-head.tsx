import { component$ } from "@builder.io/qwik";
import { useDocumentHead, useLocation } from "@builder.io/qwik-city";
import { getConfig } from "~/lib/config";
import { uiLocaleBootstrapJson } from "~/lib/i18n/ui-locale-segments";
import { isAdminDashboardPath } from "~/lib/i18n/ui-locale-path";
import { INLINE_CRITICAL_CSS } from "~/lib/perf/critical-css";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();
  const isAdmin = isAdminDashboardPath(loc.url.pathname);
  const uiLocaleBootstrap = uiLocaleBootstrapJson();

  return (
    <>
      <title>{head.title}</title>

      {isAdmin ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <link rel="canonical" href={loc.url.href} />
      )}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

      {/* Critical CSS: first paint + FOUC gate before Tailwind bundle loads */}
      <style id="critical-css" dangerouslySetInnerHTML={INLINE_CRITICAL_CSS} />
      
      {/* Performance optimizations - Font preloading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* When API is absolute (cross-origin), warm connection for SSR and client fetches */}
      {(() => {
        const base = getConfig().api.baseUrl?.trim() ?? "";
        if (!/^https?:\/\//i.test(base)) {
          return null;
        }
        try {
          const origin = new URL(base).origin;
          return (
            <link rel="preconnect" href={origin} crossOrigin="anonymous" />
          );
        } catch {
          return null;
        }
      })()}
      {/* Font stylesheets are injected asynchronously in the bootstrap script below */}
      
      {/* Performance optimizations */}
      <meta name="theme-color" content="#ffffff" />
      <meta httpEquiv="x-dns-prefetch-control" content="on" />
      
      {/* Initialize theme and direction before page render to prevent flash */}
      <script
        dangerouslySetInnerHTML={`
          (function() {
            // Initialize theme
            function setTheme(theme) {
              document.documentElement.classList.remove('light', 'dark');
              document.documentElement.classList.add(theme);
              localStorage.setItem('theme', theme);
            }
            const stored = localStorage.getItem('theme');
            if (stored) {
              setTheme(stored);
            } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
              setTheme('dark');
            } else {
              setTheme('light');
            }

            var __uiLocales = ${uiLocaleBootstrap};
            function __escapeRe(s) {
              return String(s).replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
            }
            var __uiLocalePattern = '^/(' + __uiLocales.codes.map(__escapeRe).join('|') + ')(?=/|$)';
            var path = (document.location.pathname || '/').replace(/\\/$/, '') || '/';
            var locMatch = path.match(new RegExp(__uiLocalePattern, 'i'));
            var logical = locMatch ? (path.slice(locMatch[0].length) || '/') : path;
            if (logical.charAt(0) !== '/') logical = '/' + logical;
            var isPublicRoute = logical === '/' || logical === '' || logical.indexOf('/services') === 0 || logical.indexOf('/work') === 0 || logical.indexOf('/about') === 0 || logical.indexOf('/pricing') === 0 || logical.indexOf('/contact') === 0 || logical.indexOf('/blog') === 0;

            function decodeCookieVal(s) {
              if (!s) return '';
              try { return decodeURIComponent(s.trim()); } catch (e) { return s.trim(); }
            }

            // Preferred UI locale + RTL hint (set by language switchers)
            var preferredLocale = null;
            var preferredRtl = null;
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
              var cookie = cookies[i].trim();
              if (cookie.indexOf('preferred-locale=') === 0) {
                preferredLocale = cookie.substring('preferred-locale='.length);
              }
              if (cookie.indexOf('preferred-locale-rtl=') === 0) {
                preferredRtl = cookie.substring('preferred-locale-rtl='.length);
              }
            }
            if (!preferredLocale && typeof localStorage !== 'undefined') {
              preferredLocale = localStorage.getItem('preferred-locale');
            }
            if (preferredRtl == null && typeof localStorage !== 'undefined') {
              preferredRtl = localStorage.getItem('preferred-locale-rtl');
            }

            // URL segment wins over cookie/storage so /ar/... paints RTL even if storage still says en.
            var urlUiLang = locMatch ? String(locMatch[1]).toLowerCase() : '';
            var fromUrl = (__uiLocales.codes.indexOf(urlUiLang) >= 0) ? urlUiLang : null;

            var rawLocale = fromUrl || decodeCookieVal(preferredLocale) || __uiLocales.default;
            var locale = rawLocale.toLowerCase();
            if (__uiLocales.codes.indexOf(locale) < 0) {
              locale = __uiLocales.default;
            }

            var rtlFlag = preferredRtl != null ? String(preferredRtl).trim() : '';
            var isRtl = fromUrl
              ? !!__uiLocales.rtl[fromUrl]
              : ((rtlFlag === '1') || (rtlFlag !== '0' && !!__uiLocales.rtl[locale]));
            var dir = isRtl ? 'rtl' : 'ltr';
            var lang = locale;

            // Load Google fonts asynchronously to avoid render blocking.
            // Only request Cairo for Arabic locale; otherwise request Inter.
            function loadFontStylesheet(href) {
              var fontLinkId = 'app-locale-font';
              var link = document.getElementById(fontLinkId);

              if (link && link.getAttribute('href') === href) {
                return;
              }

              if (!link) {
                link = document.createElement('link');
                link.id = fontLinkId;
                link.rel = 'stylesheet';
              }

              link.setAttribute('href', href);
              link.media = 'print';
              link.onload = function() {
                this.media = 'all';
              };

              if (!link.parentNode) {
                document.head.appendChild(link);
              }
            }
            if (__uiLocales.rtl[locale]) {
              loadFontStylesheet('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
            } else {
              loadFontStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            }

            // Public marketing routes: reveal body using the same locale/dir as the rest of the app
            function revealBodyForPublic() {
              document.documentElement.setAttribute('dir', dir);
              document.documentElement.setAttribute('lang', lang);
              if (document.body) {
                document.body.setAttribute('dir', dir);
                document.body.setAttribute('lang', lang);
                document.body.setAttribute('data-render-complete', 'true');
              }
            }
            if (isPublicRoute) {
              if (document.body) {
                revealBodyForPublic();
              } else {
                document.addEventListener('DOMContentLoaded', revealBodyForPublic);
              }
            }

            // Ensure body stays hidden initially by removing data-render-complete if it exists (dashboard only)
            if (!isPublicRoute && document.body && document.body.hasAttribute('data-render-complete')) {
              document.body.removeAttribute('data-render-complete');
            }
            
            document.documentElement.setAttribute('dir', dir);
            document.documentElement.setAttribute('lang', lang);
            
            // Set body attributes if body exists, otherwise use MutationObserver to set when body is created
            if (document.body) {
              document.body.setAttribute('dir', dir);
              document.body.setAttribute('lang', lang);
            } else {
              // Body doesn't exist yet - use MutationObserver to set attributes as soon as body is created
              // Also check periodically as a fallback (in case MutationObserver misses it)
              var observer = new MutationObserver(function(mutations) {
                if (document.body) {
                  var currentBodyDir = document.body.getAttribute('dir');
                  var currentBodyLang = document.body.getAttribute('lang');
                  // Only set if not already set correctly (avoid unnecessary DOM manipulation)
                  if (currentBodyDir !== dir || currentBodyLang !== lang) {
                    document.body.setAttribute('dir', dir);
                    document.body.setAttribute('lang', lang);
                  }
                  observer.disconnect();
                }
              });
              observer.observe(document.documentElement, { childList: true, subtree: true });
              
              // Fallback: check periodically if body exists (in case MutationObserver doesn't fire)
              var checkInterval = setInterval(function() {
                if (document.body) {
                  var currentBodyDir = document.body.getAttribute('dir');
                  var currentBodyLang = document.body.getAttribute('lang');
                  if (currentBodyDir !== dir || currentBodyLang !== lang) {
                    document.body.setAttribute('dir', dir);
                    document.body.setAttribute('lang', lang);
                  }
                  clearInterval(checkInterval);
                }
              }, 0);
            }
            
            // Ensure body dir matches html dir and wait for initial render
            // This handles cases where body is rendered with different dir from SSR
            // Also ensures body stays hidden until both direction and initial render are complete
            if (typeof document !== 'undefined') {
              // Use a property on document to track render completion across function calls
              if (!document.__renderCompleteStarted) {
                document.__renderCompleteStarted = true;
                var ensureBodyDir = function() {
                  if (document.body) {
                    var currentBodyDir = document.body.getAttribute('dir');
                    var currentHtmlDir = document.documentElement.getAttribute('dir');
                    // If body dir doesn't match html dir, fix it immediately
                    if (currentBodyDir !== dir || currentBodyDir !== currentHtmlDir) {
                      document.body.setAttribute('dir', dir);
                      document.body.setAttribute('lang', lang);
                    }
                    
                    // Mark render as complete after a delay to allow translations to apply
                    // Use data-render-complete attribute to signal CSS that body is ready
                    // Wait for multiple RAF cycles to ensure Qwik has finished initial render and translations
                    if (!document.__renderComplete) {
                      document.__renderComplete = true;
                      var rafCount = 0;
                      var checkRenderComplete = function() {
                        rafCount++;
                        if (document.body) {
                          // Wait for 1 RAF cycle to ensure initial render is complete
                          // This is fast enough for good UX while still preventing flash
                          if (rafCount >= 1) {
                            // Set data attribute to signal CSS that initial render is complete
                            document.body.setAttribute('data-render-complete', 'true');
                          } else {
                            requestAnimationFrame(checkRenderComplete);
                          }
                        } else {
                          requestAnimationFrame(checkRenderComplete);
                        }
                      };
                      requestAnimationFrame(checkRenderComplete);
                    }
                  } else if (typeof requestAnimationFrame !== 'undefined') {
                    // Body not ready yet, check again on next frame
                    requestAnimationFrame(ensureBodyDir);
                  }
                };
                
                // Start checking immediately and on next frame
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', ensureBodyDir);
                } else {
                  ensureBodyDir();
                }
                if (typeof requestAnimationFrame !== 'undefined') {
                  requestAnimationFrame(ensureBodyDir);
                }
              }
            }
            
          })();
        `}
      />

      {head.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}

      {head.links.map((l) => (
        <link key={l.key} {...l} />
      ))}

      {head.styles.map((s) => (
        <style
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.style })}
        />
      ))}

      {head.scripts.map((s) => (
        <script
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.script })}
        />
      ))}
    </>
  );
});
