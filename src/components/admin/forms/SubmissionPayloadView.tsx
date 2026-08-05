import { component$, $, useSignal } from '@builder.io/qwik';
import {
  buildSubmissionDisplayRows,
  submissionValueHref,
  type SubmissionDisplayRow,
} from '~/lib/admin/form-submission-payload';
import { translateApp } from '~/lib/i18n/useTranslate';

export type SubmissionPayloadViewProps = {
  lang: string;
  payload: Record<string, unknown>;
  /** Current form layout — used when payload has no field type snapshot */
  formLayout?: unknown;
};

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {/* Clipboard outline */}
      <path d="M8 2a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 12 2v.5h1.5A1.5 1.5 0 0 1 15 4v11.5A1.5 1.5 0 0 1 13.5 17h-7A1.5 1.5 0 0 1 5 15.5V4A1.5 1.5 0 0 1 6.5 2.5H8V2Zm1.5 0h1v.5h-1V2ZM6.5 4v11.5h7V4H6.5Z" />
      <path d="M8.5 7.25h5v1.5h-5v-1.5Zm0 3h5v1.5h-5v-1.5Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="h-3.5 w-3.5"
      aria-hidden="true"
    >
      {/* Success tick */}
      <path
        fill-rule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clip-rule="evenodd"
      />
    </svg>
  );
}

const SubmissionFieldRow = component$<{
  lang: string;
  row: SubmissionDisplayRow;
}>((props) => {
  const copied = useSignal(false);
  const href = submissionValueHref(props.row.type, props.row.valueText);

  const onCopy$ = $(async () => {
    const text = props.row.valueText;
    const markCopied = () => {
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 1500);
    };
    try {
      await navigator.clipboard.writeText(text);
      markCopied();
    } catch {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      markCopied();
    }
  });

  return (
    <div class="flex items-start gap-2 border-b border-gray-100 py-1.5 last:border-0 dark:border-gray-800">
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {props.row.label}
        </div>
        <div class="mt-0.5 break-words text-sm text-gray-900 dark:text-gray-100">
          {href ? (
            <a
              href={href}
              class="text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
              dir="ltr"
            >
              {props.row.valueText}
            </a>
          ) : (
            <span dir={props.row.type === 'tel' || props.row.type === 'email' ? 'ltr' : undefined}>
              {props.row.valueText}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        class={[
          'mt-0.5 flex-shrink-0 rounded border p-1 transition-colors',
          copied.value
            ? 'border-green-300 bg-green-50 text-green-600 dark:border-green-700 dark:bg-green-950/40 dark:text-green-400'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-600 dark:hover:bg-slate-800 dark:hover:text-gray-200',
        ].join(' ')}
        title={
          copied.value
            ? translateApp(props.lang, 'forms.valueCopied')
            : translateApp(props.lang, 'forms.copyValue')
        }
        aria-label={
          copied.value
            ? translateApp(props.lang, 'forms.valueCopied')
            : translateApp(props.lang, 'forms.copyValue')
        }
        onClick$={onCopy$}
      >
        {/* Swap to a green tick after a successful copy */}
        {copied.value ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
});

/**
 * Human-readable submission payload: labels, mailto/tel links, copy buttons.
 */
export const SubmissionPayloadView = component$<SubmissionPayloadViewProps>((props) => {
  const rows = buildSubmissionDisplayRows(props.payload, props.formLayout);

  if (rows.length === 0) {
    return <span class="text-xs text-gray-400">—</span>;
  }

  return (
    <div class="w-full max-w-none space-y-0">
      {rows.map((row) => (
        <SubmissionFieldRow key={row.id} lang={props.lang} row={row} />
      ))}
    </div>
  );
});
