import { $, component$, useSignal, useTask$ } from '@builder.io/qwik';
import { isBrowser } from '@builder.io/qwik/build';
import { MarketingLink } from '~/components/marketing/MarketingLink';
import { useTranslate, translateApp } from '~/lib/i18n/useTranslate';
import type { PublicNavItem } from '~/lib/marketing/public-menu';

export type MobileMenuDirection = 'start' | 'end' | 'top' | 'bottom';
export type MobileMenuAnimation = 'slide' | 'fade' | 'none';

export type HeaderMobileMenuKitProps = {
  items: PublicNavItem[];
  showBelow: string;
  trigger: string;
  triggerLabel: string;
  panel: string;
  direction: string;
  animation: string;
  showChildren: boolean;
  /** Builder canvas: always show the button so it can be selected on every device frame. */
  editorPreview?: boolean;
};

/** Class strings stay literal so Tailwind keeps them. */
const SHOW_BELOW_CLASS: Record<string, string> = {
  desktop: 'lg:hidden',
  tablet: 'md:hidden',
  always: '',
};

const DRAWER_PLACEMENT: Record<MobileMenuDirection, string> = {
  start: 'inset-y-0 start-0 w-80 max-w-[85vw]',
  end: 'inset-y-0 end-0 w-80 max-w-[85vw]',
  top: 'inset-x-0 top-0 max-h-[85vh]',
  bottom: 'inset-x-0 bottom-0 max-h-[85vh]',
};

const SLIDE_CLOSED: Record<MobileMenuDirection, string> = {
  start: '-translate-x-full rtl:translate-x-full',
  end: 'translate-x-full rtl:-translate-x-full',
  top: '-translate-y-full',
  bottom: 'translate-y-full',
};

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function panelStateClass(open: boolean, animation: MobileMenuAnimation, direction: MobileMenuDirection): string {
  if (animation === 'none') return open ? '' : 'hidden';
  const motion = 'transition duration-300 ease-out motion-reduce:transition-none';
  if (open) return `${motion} visible translate-x-0 translate-y-0 opacity-100`;
  const hidden = animation === 'fade' ? 'opacity-0' : SLIDE_CLOSED[direction];
  return `${motion} invisible pointer-events-none ${hidden}`;
}

const MenuIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ) : (
    <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );

/**
 * `header_mobile_menu`: a button that opens the chosen menu in a drawer or full-screen panel.
 * Position, entry direction and animation come from the kit settings.
 */
export const HeaderMobileMenuKit = component$<HeaderMobileMenuKitProps>((props) => {
  const { lang } = useTranslate();
  const open = useSignal(false);
  const direction = pick<MobileMenuDirection>(props.direction, ['start', 'end', 'top', 'bottom'], 'end');
  const animation = pick<MobileMenuAnimation>(props.animation, ['slide', 'fade', 'none'], 'slide');
  const fullscreen = props.panel === 'fullscreen';
  const trigger = pick(props.trigger, ['icon', 'label', 'icon_label'], 'icon');
  const label = props.triggerLabel.trim();
  const visibility = props.editorPreview ? '' : SHOW_BELOW_CLASS[props.showBelow] ?? 'lg:hidden';

  useTask$(({ track, cleanup }) => {
    const isOpen = track(() => open.value);
    if (!isBrowser || !isOpen) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';
    cleanup(() => {
      root.style.overflow = previous;
    });
  });

  const close = $(() => {
    open.value = false;
  });

  return (
    <div
      class={visibility}
      document:onKeyDown$={(event) => {
        if (open.value && (event as KeyboardEvent).key === 'Escape') open.value = false;
      }}
    >
      {/* Trigger */}
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg p-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-expanded={open.value}
        aria-label={trigger === 'label' && label ? undefined : translateApp(lang, 'header.openMenu')}
        onClick$={() => {
          open.value = !open.value;
        }}
      >
        {trigger !== 'label' ? <MenuIcon open={false} /> : null}
        {trigger !== 'icon' && label ? <span>{label}</span> : null}
      </button>

      {/* Backdrop */}
      {fullscreen ? null : (
        <div
          class={[
            'fixed inset-0 z-50 bg-slate-950/50',
            animation === 'none'
              ? open.value
                ? ''
                : 'hidden'
              : `transition-opacity duration-300 motion-reduce:transition-none ${open.value ? 'opacity-100' : 'pointer-events-none invisible opacity-0'}`,
          ].join(' ')}
          aria-hidden="true"
          onClick$={close}
        />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label || translateApp(lang, 'header.openMenu')}
        class={[
          'fixed z-[60] flex flex-col overflow-y-auto bg-white p-4 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100',
          fullscreen ? 'inset-0' : DRAWER_PLACEMENT[direction],
          panelStateClass(open.value, animation, direction),
        ].join(' ')}
      >
        <div class="mb-2 flex justify-end">
          <button
            type="button"
            class="rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={translateApp(lang, 'header.closeMenu')}
            onClick$={close}
          >
            <MenuIcon open={true} />
          </button>
        </div>
        <nav aria-label={label || 'Mobile'}>
          <ul class="space-y-1" role="list">
            {props.items.map((item) => (
              <li key={item.href + item.label}>
                <MarketingLink
                  href={item.href}
                  class="block rounded-lg px-3 py-2 text-base font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
                  {...(item.open_in_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  onClick$={close}
                >
                  {item.label}
                </MarketingLink>
                {props.showChildren && item.children && item.children.length > 0 ? (
                  <ul class="ms-4 space-y-1 border-s border-slate-200 ps-2 dark:border-slate-700" role="list">
                    {item.children.map((child) => (
                      <li key={child.href + child.label}>
                        <MarketingLink
                          href={child.href}
                          class="block rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          {...(child.open_in_new_tab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                          onClick$={close}
                        >
                          {child.label}
                        </MarketingLink>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
});
