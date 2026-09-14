import { component$, type QRL } from '@builder.io/qwik';
import { ADMIN_NATIVE_OPTION_CLASS, ADMIN_NATIVE_SELECT_COMPACT_CLASS } from '~/lib/admin/native-select-classes';

type Rule = { field: string; op: string; value: string };
type Conditions = { relation: 'and' | 'or'; rules: Rule[] };

export const FormConditionFields = component$<{
  value: unknown;
  onChange$: QRL<(next: Conditions | null) => void>;
}>((props) => {
  const raw = props.value && typeof props.value === 'object' ? (props.value as Conditions) : null;
  const relation = raw?.relation === 'or' ? 'or' : 'and';
  const rules = Array.isArray(raw?.rules) ? raw!.rules : [];

  return (
    <div class="space-y-2">
      <p class="text-xs font-medium text-gray-600 dark:text-gray-300">Visibility (AND/OR)</p>
      <select
        class={`${ADMIN_NATIVE_SELECT_COMPACT_CLASS} w-full`}
        value={relation}
        onChange$={async (e) => {
          await props.onChange$({
            relation: (e.target as HTMLSelectElement).value as 'and' | 'or',
            rules: rules.length ? rules : [{ field: '', op: 'equals', value: '' }],
          });
        }}
      >
        <option class={ADMIN_NATIVE_OPTION_CLASS} value="and">
          All rules (AND)
        </option>
        <option class={ADMIN_NATIVE_OPTION_CLASS} value="or">
          Any rule (OR)
        </option>
      </select>
      {rules.map((rule, i) => (
        <div key={i} class="grid grid-cols-3 gap-1">
          <input
            class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-slate-900"
            placeholder="field id"
            value={rule.field}
            onInput$={async (e) => {
              const next = rules.map((r, idx) =>
                idx === i ? { ...r, field: (e.target as HTMLInputElement).value } : r,
              );
              await props.onChange$({ relation, rules: next });
            }}
          />
          <select
            class={ADMIN_NATIVE_SELECT_COMPACT_CLASS}
            value={rule.op || 'equals'}
            onChange$={async (e) => {
              const next = rules.map((r, idx) =>
                idx === i ? { ...r, op: (e.target as HTMLSelectElement).value } : r,
              );
              await props.onChange$({ relation, rules: next });
            }}
          >
            {['equals', 'contains', 'empty', 'not_empty'].map((op) => (
              <option key={op} class={ADMIN_NATIVE_OPTION_CLASS} value={op}>
                {op}
              </option>
            ))}
          </select>
          <input
            class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-slate-900"
            placeholder="value"
            value={rule.value}
            onInput$={async (e) => {
              const next = rules.map((r, idx) =>
                idx === i ? { ...r, value: (e.target as HTMLInputElement).value } : r,
              );
              await props.onChange$({ relation, rules: next });
            }}
          />
        </div>
      ))}
      <button
        type="button"
        class="text-xs text-primary-600"
        onClick$={async () => {
          await props.onChange$({
            relation,
            rules: [...rules, { field: '', op: 'equals', value: '' }],
          });
        }}
      >
        Add rule
      </button>
    </div>
  );
});
