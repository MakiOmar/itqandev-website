import { component$, type QRL } from '@builder.io/qwik';

export type AdminSwitchProps = {
  checked: boolean;
  /** Visible label next to the control (optional). */
  label?: string;
  /** Accessible name when no visible label is shown. */
  ariaLabel?: string;
  onChange$: QRL<(checked: boolean) => void>;
};

/** Compact on/off switch for admin appearance builders (RTL-aware thumb). */
export const AdminSwitch = component$<AdminSwitchProps>((props) => {
  const on = props.checked === true;
  return (
    <div class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <button
        type="button"
        role="switch"
        aria-checked={on ? 'true' : 'false'}
        aria-label={props.ariaLabel || props.label || 'Toggle'}
        class={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          on ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
        ].join(' ')}
        onClick$={async () => {
          // Read live prop inside the QRL so toggles are not stuck on a stale render capture.
          await props.onChange$(props.checked !== true);
        }}
      >
        <span
          class={[
            'pointer-events-none absolute top-0.5 start-0.5 inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition',
            // Logical start → end travel (LTR: +x, RTL: -x)
            on ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {props.label ? <span class="whitespace-nowrap">{props.label}</span> : null}
    </div>
  );
});
