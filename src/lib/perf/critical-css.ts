/**
 * Inline critical CSS — parsed before external stylesheets (see RouterHead).
 *
 * Keep small (&lt; ~2KB). Scope: FOUC/render gate, system font fallbacks, public shell.
 * Full Tailwind stays in styles/site.css (marketing) or styles/admin.css (dashboard).
 *
 * Do not duplicate large utility sets here; update this file when changing body visibility
 * or public first-paint layout in global.css.
 */
export const INLINE_CRITICAL_CSS = `
body{visibility:hidden!important;opacity:0!important}
html[dir] body[dir][data-render-complete]{visibility:visible!important;opacity:1!important}
body:has([data-public-page]){visibility:visible!important;opacity:1!important}
body:not([data-render-complete]) *{transition:none!important;animation:none!important}
body:not([data-render-complete]) button,body:not([data-render-complete]) [role="button"],
body:not([data-render-complete]) a,body:not([data-render-complete]) input,
body:not([data-render-complete]) select,body:not([data-render-complete]) textarea{
  transition:color .2s ease,background-color .2s ease,border-color .2s ease,opacity .2s ease,transform .2s ease!important
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-rendering:optimizeSpeed}
body{margin:0;min-height:100vh;line-height:1.5;
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  background:linear-gradient(135deg,#fafbfc 0%,#f5f7fa 100%);color:#0f172a}
html[dir="rtl"],html[lang="ar"] body{
  font-family:Cairo,system-ui,'Segoe UI',Tahoma,Arial,sans-serif}
.dark body{background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#f1f5f9}
img,picture{max-width:100%;display:block;height:auto}
[data-public-page] header[role="banner"]{
  position:sticky;top:0;z-index:40;width:100%;
  border-bottom:1px solid rgb(226 232 240 / .8);
  background:rgb(255 255 255 / .8);backdrop-filter:blur(12px);color:#0f172a}
html.light [data-public-page] header[role="banner"],
html:not(.dark) [data-public-page] header[role="banner"]{
  color:#0f172a}
html.light [data-public-page] header[role="banner"] a:not([class*="bg-primary"]),
html.light [data-public-page] header[role="banner"] button:not([class*="bg-primary"]),
html:not(.dark) [data-public-page] header[role="banner"] a:not([class*="bg-primary"]),
html:not(.dark) [data-public-page] header[role="banner"] button:not([class*="bg-primary"]){
  color:#334155}
html.light [data-public-page] header[role="banner"] a[class*="bg-primary-100"],
html.light [data-public-page] header[role="banner"] button[class*="bg-primary-100"],
html:not(.dark) [data-public-page] header[role="banner"] a[class*="bg-primary-100"],
html:not(.dark) [data-public-page] header[role="banner"] button[class*="bg-primary-100"]{
  color:#0c4a6e}
.dark [data-public-page] header[role="banner"]{
  border-bottom-color:rgb(51 65 85 / .8);background:rgb(15 23 42 / .8);color:#f1f5f9}
.dark [data-public-page] header[role="banner"] a:not([class*="bg-primary"]),
.dark [data-public-page] header[role="banner"] button:not([class*="bg-primary"]){
  color:#e2e8f0}
.dark [data-public-page] header[role="banner"] a[class*="bg-primary-100"],
.dark [data-public-page] header[role="banner"] button[class*="bg-primary-100"]{
  color:#0c4a6e}
`.trim();
