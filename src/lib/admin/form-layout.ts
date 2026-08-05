import type {
  FormActionNode,
  FormFieldNode,
  FormFieldSpan,
  FormLayoutDocument,
  FormRowNode,
  FormSettings,
} from '~/types/form';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `f_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeSpan(span: unknown): FormFieldSpan {
  if (typeof span === 'number') {
    const n = Math.min(12, Math.max(1, Math.round(span) || 12));
    return { mobile: 12, tablet: n, desktop: n };
  }
  const o = span && typeof span === 'object' ? (span as Record<string, unknown>) : {};
  const desktop = Math.min(12, Math.max(1, Number(o.desktop) || 12));
  const tablet = Math.min(12, Math.max(1, Number(o.tablet) || desktop));
  const mobile = Math.min(12, Math.max(1, Number(o.mobile) || 12));
  return { mobile, tablet, desktop };
}

export function ensureFormLayout(raw: unknown): FormLayoutDocument {
  const src =
    raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)
      ? (raw as { rows: unknown[] }).rows
      : Array.isArray(raw)
        ? raw
        : [];
  const rows: FormRowNode[] = [];
  for (const row of src) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    const fieldsIn = Array.isArray(r.fields) ? r.fields : [];
    const fields: FormFieldNode[] = [];
    for (const field of fieldsIn) {
      if (!field || typeof field !== 'object') continue;
      const f = field as Record<string, unknown>;
      const type = String(f.type || '');
      if (!type) continue;
      fields.push({
        id: String(f.id || newId()),
        type,
        span: normalizeSpan(f.span),
        settings:
          f.settings && typeof f.settings === 'object'
            ? (f.settings as Record<string, unknown>)
            : {},
      });
    }
    if (fields.length === 0) continue;
    rows.push({ id: String(r.id || newId()), fields });
  }
  if (rows.length === 0) {
    return {
      rows: [
        {
          id: newId(),
          fields: [
            {
              id: newId(),
              type: 'text',
              span: normalizeSpan({ desktop: 6, tablet: 6, mobile: 12 }),
              settings: { label: 'Name', name: 'name', required: true },
            },
            {
              id: newId(),
              type: 'email',
              span: normalizeSpan({ desktop: 6, tablet: 6, mobile: 12 }),
              settings: { label: 'Email', name: 'email', required: true },
            },
          ],
        },
        {
          id: newId(),
          fields: [
            {
              id: newId(),
              type: 'textarea',
              span: normalizeSpan(12),
              settings: { label: 'Message', name: 'message', required: true, rows: 4 },
            },
          ],
        },
      ],
    };
  }
  return { rows };
}

export function ensureFormActions(raw: unknown): FormActionNode[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { actions?: unknown }).actions)
      ? ((raw as { actions: unknown[] }).actions)
      : [];
  const out: FormActionNode[] = [];
  for (const action of list) {
    if (!action || typeof action !== 'object') continue;
    const a = action as Record<string, unknown>;
    const type = String(a.type || '');
    if (!type) continue;
    out.push({
      id: String(a.id || newId()),
      type,
      enabled: a.enabled !== false,
      settings:
        a.settings && typeof a.settings === 'object'
          ? (a.settings as Record<string, unknown>)
          : {},
    });
  }
  if (!out.some((a) => a.type === 'store_submission')) {
    out.unshift({
      id: 'store_submission_default',
      type: 'store_submission',
      enabled: true,
      settings: { store_ip: true },
    });
  }
  return out;
}

export function ensureFormSettings(raw: unknown): FormSettings {
  const o = raw && typeof raw === 'object' ? (raw as FormSettings) : {};
  return {
    submit_label: String(o.submit_label ?? 'Submit'),
    success_message: String(o.success_message ?? 'Thank you. We received your submission.'),
    error_message: String(o.error_message ?? 'Something went wrong. Please try again.'),
    success_mode: o.success_mode === 'redirect' ? 'redirect' : 'message',
    honeypot: o.honeypot !== false,
    captcha:
      o.captcha === 'turnstile' ||
      o.captcha === 'recaptcha_v2' ||
      o.captcha === 'recaptcha_v3'
        ? o.captcha
        : 'none',
    store_ip: o.store_ip !== false,
    translations:
      o.translations && typeof o.translations === 'object'
        ? (o.translations as Record<string, Record<string, unknown>>)
        : {},
  };
}

export function createEmptyRow(): FormRowNode {
  return { id: newId(), fields: [] };
}

export function createFieldFromRegistry(
  type: string,
  defaults: Record<string, unknown>,
  span: number | FormFieldSpan = 12,
): FormFieldNode {
  return {
    id: newId(),
    type,
    span: normalizeSpan(span),
    settings: { ...defaults },
  };
}

export function createActionFromRegistry(
  type: string,
  defaults: Record<string, unknown>,
  enabled = true,
): FormActionNode {
  return {
    id: newId(),
    type,
    enabled,
    settings: { ...defaults },
  };
}

export function previewFieldSpanClass(span: number): string {
  const n = Math.min(12, Math.max(1, span));
  const map: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
    6: 'col-span-6',
    7: 'col-span-7',
    8: 'col-span-8',
    9: 'col-span-9',
    10: 'col-span-10',
    11: 'col-span-11',
    12: 'col-span-12',
  };
  return map[n] || 'col-span-12';
}

export function effectiveFieldSpan(
  span: FormFieldSpan,
  device: 'mobile' | 'tablet' | 'desktop',
): number {
  return span[device] || 12;
}
