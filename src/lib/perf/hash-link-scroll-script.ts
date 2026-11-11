/**
 * Same-page `#id` links on public pages scroll smoothly and stop below a sticky site header.
 * Qwik City (its document listener and `<Link>` navigation) scrolls hash targets with a bare
 * `scrollIntoView()`, which follows the root `scroll-behavior`, so this only turns smooth scrolling
 * on for that click instead of taking the scroll over. Capture phase: Qwik handlers load lazily.
 * The header offset is read by `[data-public-page] [id]{scroll-margin-top}` in foundation.css.
 */
export const HASH_LINK_SCROLL_SCRIPT = `
(function() {
  if (window.__bHashLinkScroll) return;
  window.__bHashLinkScroll = true;
  var root = document.documentElement;
  var timer = 0;
  function reset() {
    clearTimeout(timer);
    root.style.scrollBehavior = '';
    document.removeEventListener('scrollend', reset);
  }
  document.addEventListener('click', function(e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || a.hasAttribute('download') || !a.closest('[data-public-page]')) return;
    var target = a.getAttribute('target');
    if (target && target !== '_self') return;
    var dest;
    try { dest = new URL(a.href, location.href); } catch (err) { return; }
    if (dest.origin !== location.origin || dest.pathname !== location.pathname || dest.search !== location.search) return;
    if (dest.hash.length < 2) return;
    var id;
    try { id = decodeURIComponent(dest.hash.slice(1)); } catch (err) { return; }
    if (!document.getElementById(id)) return;
    var header = document.querySelector('[data-public-page] [data-site-header]');
    var offset = 0;
    if (header) {
      var cs = getComputedStyle(header);
      if (cs.position === 'sticky' || cs.position === 'fixed') offset = header.offsetHeight + (parseFloat(cs.top) || 0);
    }
    root.style.setProperty('--b-anchor-offset', offset + 'px');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    reset();
    root.style.scrollBehavior = 'smooth';
    document.addEventListener('scrollend', reset);
    timer = setTimeout(reset, 3000);
  }, true);
})();
`.trim();
