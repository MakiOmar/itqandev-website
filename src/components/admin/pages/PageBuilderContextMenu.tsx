import { $, component$, useOnDocument, useOnWindow, useSignal, useVisibleTask$, type QRL } from '@builder.io/qwik';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { BuilderNodeAction } from '~/lib/admin/page-builder-node-actions';

export type PageBuilderContextMenuProps = {
  lang: string;
  x: number;
  y: number;
  /** Node label shown in the menu title and the Edit item ("Row 2", "Heading"). */
  label: string;
  canPaste: boolean;
  canPasteStyle: boolean;
  /** Opened from the navigator: no "Navigator" item. */
  fromNavigator: boolean;
  /** Widget/kit blocks can be saved as a global; global placements can be unlinked. */
  globalAction: 'save' | 'unlink' | null;
  onAction$: QRL<(action: BuilderNodeAction) => void>;
  onClose$: QRL<() => void>;
};

type MenuItem = {
  action: BuilderNodeAction;
  labelKey: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separatorBefore?: boolean;
};

const MENU_WIDTH = 224;

/** Right-click menu for a builder node; shared by the canvas and the navigator. */
export const PageBuilderContextMenu = component$<PageBuilderContextMenuProps>((props) => {
  const menuRef = useSignal<HTMLElement>();
  const position = useSignal({ x: props.x, y: props.y });

  const items: MenuItem[] = [
    { action: 'edit', labelKey: 'pages.ctxEdit' },
    { action: 'duplicate', labelKey: 'pages.ctxDuplicate', shortcut: 'Ctrl+D', separatorBefore: true },
    { action: 'copy', labelKey: 'pages.ctxCopy', shortcut: 'Ctrl+C' },
    { action: 'paste', labelKey: 'pages.ctxPaste', shortcut: 'Ctrl+V', disabled: !props.canPaste },
    { action: 'copy_style', labelKey: 'pages.ctxCopyStyle', separatorBefore: true },
    { action: 'paste_style', labelKey: 'pages.ctxPasteStyle', disabled: !props.canPasteStyle },
    { action: 'reset_style', labelKey: 'pages.ctxResetStyle' },
    ...(props.globalAction === 'save'
      ? [{ action: 'save_global' as const, labelKey: 'pages.ctxSaveGlobal', separatorBefore: true }]
      : props.globalAction === 'unlink'
        ? [{ action: 'unlink_global' as const, labelKey: 'pages.ctxUnlinkGlobal', separatorBefore: true }]
        : []),
    ...(props.fromNavigator
      ? []
      : [{ action: 'navigator' as const, labelKey: 'pages.navigator', separatorBefore: true }]),
    { action: 'delete', labelKey: 'pages.ctxDelete', shortcut: 'Del', danger: true, separatorBefore: true },
  ];

  // Keep the menu inside the viewport and focus the first item for keyboard use.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const el = menuRef.value;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    position.value = {
      x: Math.max(8, Math.min(props.x, window.innerWidth - rect.width - 8)),
      y: Math.max(8, Math.min(props.y, window.innerHeight - rect.height - 8)),
    };
    el.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus();
  });

  useOnDocument(
    'pointerdown',
    $((e: Event) => {
      const el = menuRef.value;
      if (el && !el.contains(e.target as Node)) props.onClose$();
    }),
  );

  useOnWindow(
    'keydown',
    $((e: Event) => {
      const key = (e as KeyboardEvent).key;
      if (key === 'Escape') {
        e.stopPropagation();
        props.onClose$();
        return;
      }
      if (key !== 'ArrowDown' && key !== 'ArrowUp') return;
      e.preventDefault();
      const buttons = Array.from(
        menuRef.value?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [],
      );
      if (buttons.length === 0) return;
      const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const step = key === 'ArrowDown' ? 1 : -1;
      buttons[(at + step + buttons.length) % buttons.length]?.focus();
    }),
  );

  useOnWindow('resize', $(() => props.onClose$()));

  return (
    <div
      ref={menuRef}
      role="menu"
      data-builder-context-menu
      aria-label={props.label}
      preventdefault:contextmenu
      class="fixed z-[80] rounded-lg border border-gray-200 bg-white py-1 text-xs shadow-2xl dark:border-gray-700 dark:bg-slate-900"
      style={{ left: `${position.value.x}px`, top: `${position.value.y}px`, width: `${MENU_WIDTH}px` }}
    >
      {/* Node title */}
      <p class="truncate px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {props.label}
      </p>
      {items.map((item) => (
        <div key={item.action}>
          {item.separatorBefore ? <div class="my-1 border-t border-gray-100 dark:border-gray-800" role="separator" /> : null}
          <button
            type="button"
            role="menuitem"
            disabled={item.disabled}
            class={[
              'flex w-full items-center justify-between gap-3 px-3 py-1.5 text-start focus:outline-none disabled:cursor-default disabled:opacity-40',
              item.danger
                ? 'text-red-600 hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus:bg-red-950/40'
                : 'text-gray-700 hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-200 dark:hover:bg-slate-800 dark:focus:bg-slate-800',
            ].join(' ')}
            onClick$={async () => {
              await props.onAction$(item.action);
              await props.onClose$();
            }}
          >
            <span class="truncate">
              {item.action === 'edit'
                ? `${translateApp(props.lang, item.labelKey)} ${props.label}`
                : translateApp(props.lang, item.labelKey)}
            </span>
            {item.shortcut ? (
              <kbd class="font-sans text-[10px] text-gray-400 dark:text-gray-500" dir="ltr">
                {item.shortcut}
              </kbd>
            ) : null}
          </button>
        </div>
      ))}
    </div>
  );
});
