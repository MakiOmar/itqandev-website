import { component$, useSignal, useVisibleTask$, $ } from '@builder.io/qwik';
import { getApiClient } from '~/lib/api/client';
import { API_ENDPOINTS } from '~/lib/api/endpoints';
import {
  effectiveFieldSpan,
  ensureFormLayout,
  ensureFormSettings,
  previewFieldSpanClass,
} from '~/lib/admin/form-layout';
import {
  fieldUsesWesternDigits,
  normalizeWesternDigits,
} from '~/lib/forms/western-digits';
import type {
  FormFieldNode,
  FormFieldSpan,
  FormLayoutDocument,
  FormSettings,
  PublicFormDefinition,
} from '~/types/form';
import { isHiddenOnDevice } from '~/lib/marketing/device-visibility';
import { useLayoutDevice } from '~/lib/marketing/layout-device-context';
import { StyledBuilderLeaf } from '~/components/marketing/widgets/StyledBuilderLeaf';
import { hasAnyStyles } from '~/lib/marketing/builder-styles';

/** Convert Eastern/Persian digits as the user types into email/tel fields. */
const onWesternDigitsInput$ = $((e: Event) => {
  const el = e.target as HTMLInputElement;
  const next = normalizeWesternDigits(el.value);
  if (next !== el.value) {
    el.value = next;
  }
});

export type FormRendererProps = {
  /** Public form slug */
  slug: string;
  /** Presentation locale sent as X-Content-Locale */
  contentLocale: string;
  /** Optional heading override (homepage section) */
  title?: string;
  /** Optional intro override */
  subtitle?: string;
  class?: string;
};

const MD_SPAN: Record<number, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
  5: 'md:col-span-5',
  6: 'md:col-span-6',
  7: 'md:col-span-7',
  8: 'md:col-span-8',
  9: 'md:col-span-9',
  10: 'md:col-span-10',
  11: 'md:col-span-11',
  12: 'md:col-span-12',
};

const LG_SPAN: Record<number, string> = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
  5: 'lg:col-span-5',
  6: 'lg:col-span-6',
  7: 'lg:col-span-7',
  8: 'lg:col-span-8',
  9: 'lg:col-span-9',
  10: 'lg:col-span-10',
  11: 'lg:col-span-11',
  12: 'lg:col-span-12',
};

function fieldSpanClass(span: FormFieldSpan): string {
  const mobile = effectiveFieldSpan(span, 'mobile');
  const tablet = effectiveFieldSpan(span, 'tablet');
  const desktop = effectiveFieldSpan(span, 'desktop');
  return [
    previewFieldSpanClass(mobile),
    MD_SPAN[tablet] || 'md:col-span-12',
    LG_SPAN[desktop] || 'lg:col-span-12',
  ].join(' ');
}

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

function loadScriptOnce(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const el = document.createElement('script');
    el.id = id;
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

function mapPublicForm(raw: Record<string, unknown>): PublicFormDefinition {
  const layout = ensureFormLayout(raw.layout);
  const settings = ensureFormSettings(raw.settings);
  const captchaRaw = raw.captcha;
  const captcha =
    captchaRaw && typeof captchaRaw === 'object'
      ? {
          provider: String((captchaRaw as { provider?: string }).provider ?? settings.captcha ?? 'none'),
          site_key: ((captchaRaw as { site_key?: string | null }).site_key ?? null) as string | null,
        }
      : { provider: String(settings.captcha ?? 'none'), site_key: null };
  return {
    id: Number(raw.id),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    layout,
    settings,
    captcha,
  };
}

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-slate-900 dark:text-gray-100';

function renderFieldControl(field: FormFieldNode) {
  const s = field.settings || {};
  const label = String(s.label ?? field.type);
  const placeholder = String(s.placeholder ?? '');
  const required = Boolean(s.required);
  const help = String(s.help ?? '');
  const name = field.id;
  const options = fieldOptions(s);

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

  if (field.type === 'select') {
    return (
      <label class="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required ? ' *' : ''}
        <select class={inputClass} name={name} required={required}>
          <option value="">{placeholder || '—'}</option>
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

/**
 * Public form renderer: loads definition by slug and posts submissions to the API.
 */
export const FormRenderer = component$<FormRendererProps>((props) => {
  const def = useSignal<PublicFormDefinition | null>(null);
  const loading = useSignal(true);
  const error = useSignal('');
  const successMsg = useSignal('');
  const submitting = useSignal(false);
  const captchaReady = useSignal(false);
  const layoutDevice = useLayoutDevice();

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => props.slug);
    track(() => props.contentLocale);
    loading.value = true;
    error.value = '';
    successMsg.value = '';
    try {
      const api = getApiClient(null, props.contentLocale);
      const res = await api.get(API_ENDPOINTS.PUBLIC_FORMS.GET(props.slug));
      const body = ((res as { data?: unknown })?.data ?? res) as Record<string, unknown>;
      def.value = mapPublicForm(body);
    } catch (err) {
      def.value = null;
      error.value = String((err as { message?: string })?.message || 'Form not found');
    } finally {
      loading.value = false;
    }
  });

  // Load captcha widgets when provider is set.
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    track(() => def.value?.captcha?.provider);
    track(() => def.value?.captcha?.site_key);
    const provider = def.value?.captcha?.provider;
    const siteKey = def.value?.captcha?.site_key;
    captchaReady.value = false;
    if (!provider || provider === 'none' || !siteKey) {
      return;
    }
    try {
      if (provider === 'turnstile') {
        await loadScriptOnce(
          'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
          'cf-turnstile-api',
        );
        captchaReady.value = true;
        const w = window as unknown as {
          turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => void };
        };
        const mount = document.getElementById('form-captcha-mount');
        if (mount && w.turnstile) {
          mount.innerHTML = '';
          w.turnstile.render(mount, {
            sitekey: siteKey,
            callback: (token: string) => {
              const hidden = document.getElementById('form-captcha-token') as HTMLInputElement | null;
              if (hidden) hidden.value = token;
            },
          });
        }
      } else if (provider === 'recaptcha_v2' || provider === 'recaptcha_v3') {
        await loadScriptOnce(
          `https://www.google.com/recaptcha/api.js${provider === 'recaptcha_v3' ? `?render=${encodeURIComponent(siteKey)}` : ''}`,
          'google-recaptcha-api',
        );
        captchaReady.value = true;
        if (provider === 'recaptcha_v2') {
          const mount = document.getElementById('form-captcha-mount');
          if (mount) {
            mount.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'g-recaptcha';
            div.setAttribute('data-sitekey', siteKey);
            div.setAttribute('data-callback', 'onCredoRecaptcha');
            (window as unknown as { onCredoRecaptcha?: (t: string) => void }).onCredoRecaptcha = (
              token: string,
            ) => {
              const hidden = document.getElementById('form-captcha-token') as HTMLInputElement | null;
              if (hidden) hidden.value = token;
            };
            mount.appendChild(div);
          }
        }
      }
    } catch {
      captchaReady.value = false;
    }
  });

  const onSubmit$ = $(async (ev: Event) => {
    ev.preventDefault();
    const formEl = ev.target as HTMLFormElement;
    if (!def.value || submitting.value) return;
    submitting.value = true;
    error.value = '';
    successMsg.value = '';
    try {
      const provider = def.value.captcha?.provider || def.value.settings.captcha || 'none';
      const siteKey = def.value.captcha?.site_key;
      const fd = new FormData(formEl);

      if (provider === 'recaptcha_v3' && siteKey) {
        const grecaptcha = (
          window as unknown as {
            grecaptcha?: { execute: (k: string, o: { action: string }) => Promise<string> };
          }
        ).grecaptcha;
        if (grecaptcha) {
          const token = await grecaptcha.execute(siteKey, { action: 'form_submit' });
          fd.set('captcha_token', token);
        }
      } else {
        const tokenEl = formEl.querySelector('#form-captcha-token') as HTMLInputElement | null;
        if (tokenEl?.value) {
          fd.set('captcha_token', tokenEl.value);
        }
        const cf = fd.get('cf-turnstile-response');
        if (cf && !fd.get('captcha_token')) {
          fd.set('captcha_token', String(cf));
        }
      }

      const hasFile = Array.from(fd.entries()).some(([, v]) => v instanceof File && v.size > 0);
      const api = getApiClient(null, props.contentLocale);
      let res: { data?: unknown } & Record<string, unknown>;
      if (hasFile) {
        res = (await api.post(API_ENDPOINTS.PUBLIC_FORMS.SUBMIT(props.slug), fd)) as any;
      } else {
        const json: Record<string, unknown> = {};
        fd.forEach((value, key) => {
          if (key.endsWith('[]')) {
            const base = key.slice(0, -2);
            const list = (json[base] as unknown[]) || [];
            list.push(value);
            json[base] = list;
          } else {
            json[key] = value;
          }
        });
        res = (await api.post(API_ENDPOINTS.PUBLIC_FORMS.SUBMIT(props.slug), json)) as any;
      }

      const body = ((res as { data?: unknown })?.data ?? res) as {
        success?: boolean;
        message?: string;
        redirect_url?: string;
      };
      if (body.redirect_url) {
        window.location.href = String(body.redirect_url);
        return;
      }
      successMsg.value =
        String(body.message || def.value.settings.success_message || 'Thank you.') || 'Thank you.';
      formEl.reset();
    } catch (err) {
      const e = err as { message?: string; errors?: Record<string, string[] | string> };
      let msg = String(e?.message || def.value.settings.error_message || 'Something went wrong.');
      if (e.errors && typeof e.errors === 'object') {
        const first = Object.values(e.errors)[0];
        if (Array.isArray(first) && first[0]) msg = String(first[0]);
        else if (typeof first === 'string') msg = first;
      }
      error.value = msg;
    } finally {
      submitting.value = false;
    }
  });

  if (loading.value) {
    return (
      <div class={props.class || 'py-8 text-center text-sm text-gray-500'}>Loading form…</div>
    );
  }

  if (!def.value) {
    return (
      <div class={props.class || 'py-8 text-center text-sm text-red-600'}>
        {error.value || 'Form unavailable'}
      </div>
    );
  }

  const layout: FormLayoutDocument = ensureFormLayout(def.value.layout);
  const settings: FormSettings = ensureFormSettings(def.value.settings);
  const heading = props.title?.trim() || def.value.title;
  const intro = props.subtitle?.trim() || '';
  const captchaProvider = def.value.captcha?.provider || settings.captcha || 'none';

  if (successMsg.value && settings.success_mode !== 'redirect') {
    return (
      <div class={props.class || 'mx-auto max-w-2xl py-8'}>
        <div class="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-green-900 dark:border-green-900 dark:bg-green-950/40 dark:text-green-100">
          <p class="text-base font-medium">{successMsg.value}</p>
        </div>
      </div>
    );
  }

  return (
    <div class={props.class || 'mx-auto w-full max-w-3xl'}>
      {heading ? (
        <h2 class="mb-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {heading}
        </h2>
      ) : null}
      {intro ? <p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{intro}</p> : null}

      <form class="space-y-4" preventdefault:submit onSubmit$={onSubmit$}>
        {layout.rows.map((row) => {
          if (isHiddenOnDevice(row.hide_on, layoutDevice)) return null;
          const visibleFields = row.fields.filter((field) => !isHiddenOnDevice(field.hide_on, layoutDevice));
          if (visibleFields.length === 0) return null;
          return (
          <div key={row.id} class="grid grid-cols-12 gap-4">
            {visibleFields.map((field) => (
              <div key={field.id} class={fieldSpanClass(field.span)}>
                {hasAnyStyles(field.styles) ? (
                  <StyledBuilderLeaf id={field.id} styles={field.styles} settings={field.settings}>
                    {renderFieldControl(field)}
                  </StyledBuilderLeaf>
                ) : (
                  renderFieldControl(field)
                )}
              </div>
            ))}
          </div>
          );
        })}

        {/* Honeypot — bots fill this; humans never see it */}
        {settings.honeypot !== false ? (
          <div class="absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
            <label>
              Website
              <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
        ) : null}

        {captchaProvider !== 'none' ? (
          <div class="space-y-2">
            <input type="hidden" id="form-captcha-token" name="captcha_token" value="" />
            <div id="form-captcha-mount" class="min-h-[1.5rem]" />
            {!captchaReady.value ? (
              <p class="text-xs text-slate-500">Loading captcha…</p>
            ) : null}
          </div>
        ) : null}

        {error.value ? (
          <p class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error.value}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting.value}
          class="inline-flex items-center justify-center rounded-lg border border-primary-300 bg-primary-100 px-5 py-2.5 text-sm font-semibold text-primary-900 transition hover:bg-primary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-60 dark:border-primary-400 dark:bg-primary-100 dark:text-primary-900 dark:hover:bg-primary-200"
        >
          {submitting.value ? '…' : settings.submit_label || 'Submit'}
        </button>
      </form>
    </div>
  );
});
