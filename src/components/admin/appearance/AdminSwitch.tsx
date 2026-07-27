import { component$, type QRL } from '@builder.io/qwik';

export type AdminSwitchProps = {
  checked: boolean;
  label?: string;
  onChange$: QRL<(checked: boolean) => void>;
};

/** Compact on/off switch for admin appearance builders. */
export const AdminSwitch = component$<AdminSwitchProps>((props) => {
  const on = props.checked;
  return (
    <div class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={props.label || 'Toggle'}
        class={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
          on ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
        ].join(' ')}
        onClick$={async () => {
          await props.onChange$(!on);
        }}
      >
        <span
          class={[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition',
            on ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {props.label ? <span>{props.label}</span> : null}
    </div>
  );
});
