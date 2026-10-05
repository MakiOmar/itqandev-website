import {
  $,
  component$,
  useContext,
  useOnDocument,
  useSignal,
  useTask$,
} from '@builder.io/qwik';
import { useLocation } from '@builder.io/qwik-city';
import type { User } from '~/lib/auth/types';
import { logoutFromBrowser } from '~/lib/auth/logout-from-browser';
import {
  buildAdminQuickSections,
  canClearCache,
  type QuickLinkIcon,
} from '~/lib/admin/admin-quick-links';
import { runCacheClearFromBrowser } from '~/lib/admin/cache-actions';
import { translateApp } from '~/lib/i18n/translate-app';
import { AdminEditTargetContext, targetForPath } from '~/lib/marketing/admin-edit-target';
import { showError, showSuccess } from '~/lib/utils/toast';

type AdminQuickDrawerProps = {
  lang: string;
  user: Pick<User, 'name' | 'email' | 'avatar' | 'role' | 'permissions'>;
  features?: Record<string, boolean>;
  themeTemplateId: number | null;
};

/** Heroicons-style outline paths (24×24, stroke) — inline so no icon code is fetched. */
const ICON_PATHS: Record<QuickLinkIcon | 'bolt' | 'close' | 'refresh' | 'logout' | 'trash', string> = {
  edit: 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z',
  builder: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
  template: 'M9 4.5v15m-4.5-15h15a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V5.25a.75.75 0 01.75-.75z',
  home: 'M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75',
  dashboard: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  pages: 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  blog: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z',
  projects: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
  services: 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0',
  forms: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  media: 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
  menus: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
  header: 'M3.75 4.5h16.5v4.5H3.75zM3.75 12.75h16.5M3.75 16.5h10.5',
  footer: 'M3.75 7.5h10.5M3.75 11.25h16.5M3.75 15h16.5v4.5H3.75z',
  palette: 'M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z',
  settings: 'M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75',
  system: 'M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z',
  bolt: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z',
  close: 'M6 18L18 6M6 6l12 12',
  refresh: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99',
  logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0',
};

const Icon = component$<{ name: keyof typeof ICON_PATHS; class?: string }>(({ name, class: cls }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.6"
    stroke="currentColor"
    class={cls ?? 'h-4 w-4'}
    aria-hidden="true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" d={ICON_PATHS[name]} />
  </svg>
));

/**
 * Floating edge trigger + glass side drawer with admin shortcuts for the current public page.
 * Rendered by the public layout for dashboard users only, so visitors never load this chunk.
 */
export const AdminQuickDrawer = component$<AdminQuickDrawerProps>((props) => {
  const loc = useLocation();
  const targetState = useContext(AdminEditTargetContext, null);
  const open = useSignal(false);
  const clearingCache = useSignal(false);
  const closeRef = useSignal<HTMLButtonElement>();

  const t = (key: string) => translateApp(props.lang, `adminDrawer.${key}`);
  const target = targetForPath(targetState?.value ?? null, loc.url.pathname);
  const sections = buildAdminQuickSections({
    lang: props.lang,
    user: props.user,
    features: props.features,
    target,
    themeTemplateId: props.themeTemplateId,
  });
  const currentSection = sections.find((s) => s.id === 'current');
  const otherSections = sections.filter((s) => s.id !== 'current');
  const showClearCache = canClearCache(props.user);
  const initial = (props.user.name || props.user.email || '?').trim().charAt(0).toUpperCase();

  // Close on client navigation so the drawer does not cover the next page.
  useTask$(({ track }) => {
    track(() => loc.url.pathname);
    open.value = false;
  });

  // The public layout is `isolate`, so floating widgets (theme switch, floating contact) hide via this flag.
  useTask$(({ track, cleanup }) => {
    const isOpen = track(() => open.value);
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isOpen) {
      root.dataset.adminDrawer = 'open';
      requestAnimationFrame(() => closeRef.value?.focus());
    } else {
      delete root.dataset.adminDrawer;
    }
    cleanup(() => delete root.dataset.adminDrawer);
  });

  useOnDocument(
    'keydown',
    $((event: Event) => {
      const e = event as KeyboardEvent;
      if (e.altKey && (e.key === 'a' || e.key === 'A' || e.code === 'KeyA')) {
        e.preventDefault();
        open.value = !open.value;
      } else if (e.key === 'Escape' && open.value) {
        open.value = false;
      }
    }),
  );

  const clearCache$ = $(async () => {
    if (clearingCache.value) return;
    clearingCache.value = true;
    const result = await runCacheClearFromBrowser();
    clearingCache.value = false;
    if (result.ok) {
      showSuccess(translateApp(props.lang, 'adminDrawer.cacheCleared'));
    } else {
      showError(result.message || translateApp(props.lang, 'adminDrawer.cacheClearFailed'));
    }
  });

  return (
    <>
      {/* Edge trigger: amber tab with vertical label, hidden while the drawer is open */}
      <button
        type="button"
        onClick$={() => (open.value = true)}
        aria-label={t('open')}
        aria-expanded={open.value}
        aria-controls="admin-quick-drawer"
        title={t('shortcut')}
        class={[
          'group fixed top-1/2 z-[70] flex -translate-y-1/2 flex-col items-center gap-2 px-2 py-4',
          'ltr:left-0 rtl:right-0 ltr:rounded-r-2xl rtl:rounded-l-2xl',
          'bg-gradient-to-b from-amber-400 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30',
          'transition-all duration-300 hover:px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
          open.value ? 'pointer-events-none opacity-0' : 'opacity-100',
        ]}
      >
        {/* Pulse ring draws the eye without moving the layout */}
        <span class="pointer-events-none absolute inset-0 animate-pulse ltr:rounded-r-2xl rtl:rounded-l-2xl ring-2 ring-amber-300/60" aria-hidden="true" />
        <Icon name="bolt" class="relative h-4 w-4" />
        <span
          class="relative text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ writingMode: 'vertical-rl' }}
        >
          {t('trigger')}
        </span>
      </button>

      {/* Dimmed backdrop; click closes */}
      <div
        class={[
          'fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm transition-opacity duration-300',
          open.value ? 'opacity-100' : 'pointer-events-none opacity-0',
        ]}
        aria-hidden="true"
        onClick$={() => (open.value = false)}
      />

      {/* Glass drawer panel; slides in from the inline-start edge (left in LTR, right in RTL) */}
      <aside
        id="admin-quick-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        aria-hidden={!open.value}
        inert={!open.value}
        class={[
          'fixed inset-y-0 z-[91] flex w-80 flex-col text-slate-200 shadow-2xl sm:w-96',
          'ltr:left-0 rtl:right-0 ltr:border-r rtl:border-l border-amber-500/30',
          'transition-transform duration-300 ease-out',
          open.value ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full',
        ]}
        style={{ background: 'rgba(13, 19, 31, 0.88)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {/* Header: title, subtitle, close */}
        <div class="flex items-start gap-3 border-b border-white/10 px-5 py-4">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950">
            <Icon name="bolt" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-white">{t('title')}</p>
            <p class="text-xs text-slate-400">{t('subtitle')}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick$={() => (open.value = false)}
            aria-label={t('close')}
            class="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          >
            <Icon name="close" class="h-5 w-5" />
          </button>
        </div>

        {/* Status bar: role and keyboard shortcut */}
        <div class="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-2 text-[11px] text-slate-400">
          <span class="flex items-center gap-2">
            <span class="h-2 w-2 rounded-full bg-emerald-400" aria-hidden="true" />
            <span class="font-medium uppercase tracking-wide text-slate-300">{props.user.role.replace(/_/g, ' ')}</span>
          </span>
          <span>{t('shortcut')}</span>
        </div>

        {/* Scrollable body */}
        <div class="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {/* Quick commands */}
          <section>
            <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('quickCommands')}</h2>
            <div class="grid grid-cols-2 gap-2">
              {showClearCache ? (
                <button
                  type="button"
                  onClick$={clearCache$}
                  disabled={clearingCache.value}
                  class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:border-amber-500/40 hover:bg-amber-500/10 disabled:cursor-wait disabled:opacity-60"
                >
                  <Icon name="trash" class={`h-4 w-4 text-amber-400${clearingCache.value ? ' animate-pulse' : ''}`} />
                  {clearingCache.value ? t('clearingCache') : t('clearCache')}
                </button>
              ) : null}
              <button
                type="button"
                onClick$={() => window.location.reload()}
                class="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:border-amber-500/40 hover:bg-amber-500/10"
              >
                <Icon name="refresh" class="h-4 w-4 text-amber-400" />
                {t('reloadPage')}
              </button>
            </div>
          </section>

          {/* This page: editor / builder deep links, highlighted */}
          <section>
            <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t('thisPage')}</h2>
            {currentSection ? (
              <ul class="space-y-1.5">
                {currentSection.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      class="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-amber-100 transition hover:bg-amber-500/20"
                    >
                      <Icon name={link.icon} class="h-4 w-4 shrink-0 text-amber-400" />
                      <span class="min-w-0 flex-1">
                        <span class="block truncate font-medium">{link.label}</span>
                        {link.hint ? <span class="block truncate text-xs text-amber-200/70">{link.hint}</span> : null}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p class="rounded-xl border border-dashed border-white/10 px-3 py-3 text-xs text-slate-500">{t('noPageActions')}</p>
            )}
          </section>

          {/* Remaining sections: content management and site/appearance */}
          {otherSections.map((section) => (
            <section key={section.id}>
              <h2 class="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{section.title}</h2>
              <ul class="space-y-1">
                {section.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      class="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm text-slate-300 transition hover:border-white/10 hover:bg-white/5 hover:text-white"
                    >
                      <Icon name={link.icon} class="h-4 w-4 shrink-0 text-slate-500" />
                      <span class="truncate">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer: signed-in user and logout */}
        <div class="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          {props.user.avatar ? (
            <img src={props.user.avatar} alt="" width={36} height={36} class="h-9 w-9 rounded-full object-cover" />
          ) : (
            <span class="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/20 text-sm font-semibold text-amber-300">
              {initial}
            </span>
          )}
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-white">{props.user.name}</p>
            <p class="truncate text-xs text-slate-400">{props.user.email}</p>
          </div>
          <button
            type="button"
            onClick$={() => logoutFromBrowser(props.lang)}
            aria-label={t('logout')}
            title={t('logout')}
            class="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <Icon name="logout" class="h-5 w-5" />
          </button>
        </div>
      </aside>
    </>
  );
});
