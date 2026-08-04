import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import {
  ADMIN_SELECT_BACKDROP_CLS,
  ADMIN_SELECT_CHEVRON_CLS,
  ADMIN_SELECT_OPTION_ACTIVE_CLS,
  ADMIN_SELECT_OPTION_CLS,
  ADMIN_SELECT_PANEL_CLS,
  ADMIN_SELECT_TRIGGER_CLS,
} from './admin-select-classes';

export type AdminSelectOption = {
  value: string;
  label: string;
};

export type AdminSelectProps = {
  /** Native form field name (emits a hidden input when set). */
  name?: string;
  id?: string;
  value: string;
  options: AdminSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Extra classes on the relative root. */
  class?: string;
  onChange$?: QRL<(value: string) => void>;
};

/**
 * RTL-safe custom select used across the admin dashboard.
 * Prefer this over native &lt;select&gt; — OS pickers mis-align under dir=rtl.
 */
export const AdminSelect = component$<AdminSelectProps>((props) => {
  const open = useSignal(false);
  const listboxId = `${props.id || props.name || 'admin-select'}-listbox`;

  const selected = props.options.find((o) => o.value === props.value);
  const label = selected?.label || props.placeholder || '';

  const close = $(() => {
    open.value = false;
  });

  const pick = $((value: string) => {
    open.value = false;
    if (props.onChange$) {
      props.onChange$(value);
    }
  });

  return (
    <div class={['relative z-20', props.class].filter(Boolean).join(' ')}>
      {props.name ? <input type="hidden" name={props.name} value={props.value} /> : null}
      <button
        type="button"
        id={props.id}
        disabled={props.disabled}
        class={ADMIN_SELECT_TRIGGER_CLS}
        aria-haspopup="listbox"
        aria-expanded={open.value}
        aria-controls={listboxId}
        onClick$={() => {
          if (props.disabled) return;
          open.value = !open.value;
        }}
      >
        <span class={`min-w-0 flex-1 truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </span>
        <svg class={ADMIN_SELECT_CHEVRON_CLS} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fill-rule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clip-rule="evenodd"
          />
        </svg>
      </button>

      {open.value ? (
        <>
          <button type="button" class={ADMIN_SELECT_BACKDROP_CLS} aria-label="Close" onClick$={close} />
          <ul id={listboxId} role="listbox" class={ADMIN_SELECT_PANEL_CLS}>
            {props.placeholder !== undefined ? (
              <li role="option" aria-selected={props.value === ''}>
                <button
                  type="button"
                  class={[
                    ADMIN_SELECT_OPTION_CLS,
                    props.value === '' ? ADMIN_SELECT_OPTION_ACTIVE_CLS : '',
                  ].join(' ')}
                  onClick$={() => pick('')}
                >
                  <span class="truncate text-gray-500 dark:text-gray-400">{props.placeholder}</span>
                </button>
              </li>
            ) : null}
            {props.options.map((opt) => {
              const active = opt.value === props.value;
              return (
                <li key={opt.value} role="option" aria-selected={active}>
                  <button
                    type="button"
                    class={[ADMIN_SELECT_OPTION_CLS, active ? ADMIN_SELECT_OPTION_ACTIVE_CLS : ''].join(
                      ' ',
                    )}
                    onClick$={() => pick(opt.value)}
                  >
                    <span class="min-w-0 flex-1 truncate">{opt.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
});
