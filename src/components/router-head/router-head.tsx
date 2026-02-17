import { component$ } from "@builder.io/qwik";
import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();

  return (
    <>
      <title>{head.title}</title>

      <link rel="canonical" href={loc.url.href} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      
      {/* Performance optimizations - Font preloading */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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

            // Public marketing routes: show body immediately (no RTL flash concern)
            var path = (document.location.pathname || '/').replace(/\\/$/, '') || '/';
            var isPublicRoute = path === '/' || path === '' || path.indexOf('/services') === 0 || path.indexOf('/work') === 0 || path.indexOf('/about') === 0 || path.indexOf('/pricing') === 0 || path.indexOf('/contact') === 0 || path.indexOf('/blog') === 0;
            function revealBodyForPublic() {
              document.documentElement.setAttribute('dir', 'ltr');
              document.documentElement.setAttribute('lang', 'en');
              if (document.body) {
                document.body.setAttribute('dir', 'ltr');
                document.body.setAttribute('lang', 'en');
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
            
            // Initialize direction and language from cookie/localStorage
            // This must run BEFORE any content renders to prevent visual shift
            var preferredLocale = null;
            
            // Try cookie first (for SSR)
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
              var cookie = cookies[i].trim();
              if (cookie.indexOf('preferred-locale=') === 0) {
                preferredLocale = cookie.substring('preferred-locale='.length);
                break;
              }
            }
            
            // Fallback to localStorage if no cookie
            if (!preferredLocale && typeof localStorage !== 'undefined') {
              preferredLocale = localStorage.getItem('preferred-locale');
            }
            
            // Normalize locale to supported values only.
            var locale = preferredLocale === 'ar' ? 'ar' : 'en';

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
            if (locale === 'ar') {
              loadFontStylesheet('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&display=swap');
            } else {
              loadFontStylesheet('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
            }

            // Set direction and lang immediately based on locale
            // This ensures both language and direction are set before any rendering
            var dir = locale === 'ar' ? 'rtl' : 'ltr';
            var lang = locale;
            
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
