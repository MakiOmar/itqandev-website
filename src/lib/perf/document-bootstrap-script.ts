/**
 * Inline head bootstrap (theme, locale dir/lang, async fonts, body visibility).
 * Kept as a string builder so router-head stays small and we avoid read→write layout thrash.
 */
export function buildDocumentBootstrapScript(uiLocaleBootstrapJson: string): string {
  return `
(function() {
  function setTheme(theme) {
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }
  var stored = null;
  try { stored = localStorage.getItem('theme'); } catch (e) {}
  if (stored) {
    setTheme(stored);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    setTheme('dark');
  } else {
    setTheme('light');
  }

  var __uiLocales = ${uiLocaleBootstrapJson};
  window.__uiLocales = __uiLocales;
  function __escapeRe(s) {
    return String(s).replace(/[.*+?^\\$\{\}()|[\\]\\\\]/g, '\\\\$&');
  }
  var __uiLocalePattern = '^/(' + __uiLocales.codes.map(__escapeRe).join('|') + ')(?=/|$)';
  var path = (document.location.pathname || '/').replace(/\\/$/, '') || '/';
  var locMatch = path.match(new RegExp(__uiLocalePattern, 'i'));
  var logical = locMatch ? (path.slice(locMatch[0].length) || '/') : path;
  if (logical.charAt(0) !== '/') logical = '/' + logical;
  var isPublicRoute =
    logical === '/' || logical === '' ||
    logical.indexOf('/services') === 0 || logical.indexOf('/work') === 0 ||
    logical.indexOf('/about') === 0 || logical.indexOf('/pricing') === 0 ||
    logical.indexOf('/contact') === 0 || logical.indexOf('/blog') === 0;

  function decodeCookieVal(s) {
    if (!s) return '';
    try { return decodeURIComponent(s.trim()); } catch (e) { return s.trim(); }
  }

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
  if (!preferredLocale) {
    try { preferredLocale = localStorage.getItem('preferred-locale'); } catch (e) {}
  }
  if (preferredRtl == null) {
    try { preferredRtl = localStorage.getItem('preferred-locale-rtl'); } catch (e) {}
  }

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

  var root = document.documentElement;
  root.setAttribute('dir', dir);
  root.setAttribute('lang', lang);

  function applyBodyLocale(markPublicReady) {
    var body = document.body;
    if (!body) return false;
    body.setAttribute('dir', dir);
    body.setAttribute('lang', lang);
    if (markPublicReady) {
      body.setAttribute('data-render-complete', 'true');
    } else {
      body.removeAttribute('data-render-complete');
    }
    return true;
  }

  if (isPublicRoute) {
    if (!applyBodyLocale(true)) {
      document.addEventListener('DOMContentLoaded', function onDom() {
        applyBodyLocale(true);
        document.removeEventListener('DOMContentLoaded', onDom);
      });
    }
  } else {
    if (!applyBodyLocale(false)) {
      document.addEventListener('DOMContentLoaded', function onDom() {
        applyBodyLocale(false);
        document.removeEventListener('DOMContentLoaded', onDom);
      });
    }
    var revealDashboard = function() {
      var body = document.body;
      if (!body) {
        requestAnimationFrame(revealDashboard);
        return;
      }
      body.setAttribute('data-render-complete', 'true');
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        requestAnimationFrame(revealDashboard);
      });
    } else {
      requestAnimationFrame(revealDashboard);
    }
  }

  // Font loading: see SiteTypographyHead (typography bootstrap) after settings resolve.
})();
`.trim();
}
