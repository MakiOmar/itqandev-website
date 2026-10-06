/**
 * Field markup shared by the public form renderer and the form builder canvas.
 */
import { $ } from '@builder.io/qwik';
import {
  fieldUsesWesternDigits,
  normalizeWesternDigits,
} from '~/lib/forms/western-digits';
import type { FormFieldNode } from '~/types/form';

/** Convert Eastern/Persian digits as the user types into email/tel fields. */
const onWesternDigitsInput$ = $((e: Event) => {
  const el = e.target as HTMLInputElement;
  const next = normalizeWesternDigits(el.value);
  if (next !== el.value) {
    el.value = next;
  }
});

function fieldOptions(settings: Record<string, unknown>): string[] {
  const raw = settings.options;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x));
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((x) => String(x));
    } catch {
      /* ignore */
    }
  }
  return [];
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100';

const SUBMIT_ALIGN: Record<string, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  full: '',
};

/** Colours, sizes and borders come from hero-buttons.css (`btn_primary_*` in the Style tab); callers load it. */
const submitButtonClass =
  'hb-btn hb-primary inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60';

function renderSubmitControl(settings: Record<string, unknown>, submitting: boolean) {
  const align = String(settings.align ?? 'start');
  const label = String(settings.label ?? '').trim() || 'Submit';
  const loadingLabel = String(settings.loading_label ?? '').trim() || '…';
  return (
    <div class={['flex', SUBMIT_ALIGN[align] ?? 'justify-start'].join(' ')}>
      <button
        type="submit"
        disabled={submitting}
        aria-busy={submitting ? 'true' : undefined}
        class={[submitButtonClass, align === 'full' ? 'w-full' : ''].join(' ')}
      >
        {submitting ? loadingLabel : label}
      </button>
    </div>
  );
}

export type FieldControlOptions = {
  /** Public renderer only: disables the Submit button widget while posting. */
  submitting?: boolean;
};

export function renderFieldControl(field: FormFieldNode, opts: FieldControlOptions = {}) {
  const s = field.settings || {};
  const label = String(s.label ?? field.type);
  const placeholder = String(s.placeholder ?? '');
  const required = Boolean(s.required);
  const help = String(s.help ?? '');
  const name = field.id;
  const options = fieldOptions(s);

  if (field.type === 'submit') {
    return renderSubmitControl(s, Boolean(opts.submitting));
  }

  if (field.type === 'hidden') {
    return <input type="hidden" name={name} value={String(s.value ?? '')} />;
  }

  if (field.type === 'textarea') {
    return (
      <label class="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required ? ' *' : ''}
        <textarea
          class={inputClass}
          name={name}
          rows={Number(s.rows) || 4}
          placeholder={placeholder}
          required={required}
        />
        {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
      </label>
    );
  }

  if (field.type === 'html') {
    return (
      <div class="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={String(s.html || '')} />
    );
  }

  if (field.type === 'select') {
    const multiple = Boolean(s.multiple);
    return (
      <label class="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required ? ' *' : ''}
        <select class={inputClass} name={name} required={required} multiple={multiple}>
          {!multiple ? <option value="">{placeholder || '—'}</option> : null}
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
      </label>
    );
  }

  if (field.type === 'radio') {
    return (
      <fieldset class="text-sm font-medium text-gray-800 dark:text-gray-200">
        <legend>
          {label}
          {required ? ' *' : ''}
        </legend>
        <div class="mt-2 space-y-1">
          {options.map((opt) => (
            <label key={opt} class="flex items-center gap-2 font-normal">
              <input type="radio" name={name} value={opt} required={required} />
              {opt}
            </label>
          ))}
        </div>
        {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
      </fieldset>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <fieldset class="text-sm font-medium text-gray-800 dark:text-gray-200">
        <legend>
          {label}
          {required ? ' *' : ''}
        </legend>
        <div class="mt-2 space-y-1">
          {options.map((opt) => (
            <label key={opt} class="flex items-center gap-2 font-normal">
              <input type="checkbox" name={`${name}[]`} value={opt} />
              {opt}
            </label>
          ))}
        </div>
        {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
      </fieldset>
    );
  }

  if (field.type === 'consent') {
    return (
      <label class="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
        <input class="mt-1" type="checkbox" name={name} value="1" required={required} />
        <span>
          {label}
          {required ? ' *' : ''}
          {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === 'file') {
    return (
      <label class="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required ? ' *' : ''}
        <input
          class="mt-1 block w-full text-sm"
          type="file"
          name={name}
          accept={String(s.accept || '') || undefined}
          required={required}
          multiple={Boolean(s.multiple)}
        />
        {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
      </label>
    );
  }

  const inputType =
    field.type === 'email'
      ? 'email'
      : field.type === 'tel'
        ? 'tel'
        : field.type === 'url'
          ? 'url'
          : field.type === 'number'
            ? 'number'
          : field.type === 'date'
            ? 'date'
            : field.type === 'time'
              ? 'time'
              : 'text';

  const westernDigits = fieldUsesWesternDigits(field.type);

  return (
    <label class="block text-sm font-medium text-gray-800 dark:text-gray-200">
      {label}
      {required ? ' *' : ''}
      {/* Email/tel stay LTR with Western digits even on RTL pages. */}
      <input
        class={inputClass}
        type={inputType}
        name={name}
        placeholder={placeholder}
        required={required}
        min={s.min != null ? String(s.min) : undefined}
        max={s.max != null ? String(s.max) : undefined}
        dir={westernDigits ? 'ltr' : undefined}
        inputMode={
          field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined
        }
        onInput$={westernDigits ? onWesternDigitsInput$ : undefined}
      />
      {help ? <span class="mt-1 block text-xs text-gray-500">{help}</span> : null}
    </label>
  );
}
