import { component$, Slot, useSignal, useOnDocument, useOnWindow, $ } from '@builder.io/qwik';

/** Shared classes for items projected into `AdminRowActionsMenu` (links and buttons). */
export const ADMIN_ROW_ACTION_ITEM_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:bg-gray-700';

export const ADMIN_ROW_ACTION_DANGER_CLASS =
  'flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none dark:text-red-400 dark:hover:bg-red-900/30 dark:focus:bg-red-900/30';

const MENU_GAP = 4;

/**
 * Vertical-dots button that opens a row actions menu. Project `<Link>` / `<a>` / `<button>` items
 * as children; any click inside the menu closes it. The menu is `position: fixed` so table
 * wrappers with `overflow-x-auto` do not clip it.
 */
export const AdminRowActionsMenu = component$<{ label: string }>((props) => {
  const open = useSignal(false);
  const rootRef = useSignal<HTMLElement>();
  const buttonRef = useSignal<HTMLButtonElement>();
  const menuRef = useSignal<HTMLElement>();
  const position = useSignal<Record<string, string>>({});

  const close$ = $(() => {
    open.value = false;
  });

  const placeMenu$ = $(() => {
    const button = buttonRef.value;
    const menu = menuRef.value;
    if (!button || !menu) return;
    const rect = button.getBoundingClientRect();
    const rtl = getComputedStyle(button).direction === 'rtl';
    const height = menu.offsetHeight;
    const below = rect.bottom + MENU_GAP + height <= window.innerHeight;
    position.value = {
      top: `${below ? rect.bottom + MENU_GAP : Math.max(MENU_GAP, rect.top - MENU_GAP - height)}px`,
      ...(rtl ? { left: `${rect.left}px` } : { right: `${document.documentElement.clientWidth - rect.right}px` }),
    };
  });

  const toggle$ = $(async () => {
    open.value = !open.value;
    if (!open.value) return;
    // Measure after the menu is visible so the flip-up check uses its real height.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await placeMenu$();
    menuRef.value?.querySelector<HTMLElement>('a, button')?.focus();
  });

  useOnDocument(
    'click',
    $((event) => {
      if (open.value && !rootRef.value?.contains(event.target as Node)) open.value = false;
    }),
  );
  useOnDocument(
    'keydown',
    $((event) => {
      if (!open.value || (event as KeyboardEvent).key !== 'Escape') return;
      open.value = false;
      buttonRef.value?.focus();
    }),
  );
  useOnWindow(['scroll', 'resize'], close$);

  return (
    <div ref={rootRef} class="relative inline-block text-start">
      {/* Trigger: vertical dots */}
      <button
        ref={buttonRef}
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
        aria-haspopup="menu"
        aria-expanded={open.value}
        aria-label={props.label}
        title={props.label}
        onClick$={toggle$}
      >
        <svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="19" r="1.8" fill="currentColor" />
        </svg>
      </button>

      {/* Menu: kept in the DOM so projected items stay mounted; hidden until opened */}
      <div
        ref={menuRef}
        role="menu"
        class={[
          'fixed z-50 min-w-[11rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
          open.value ? '' : 'hidden',
        ].join(' ')}
        style={position.value}
        onClick$={close$}
      >
        <Slot />
      </div>
    </div>
  );
});
