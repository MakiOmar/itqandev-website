import type { FormFieldNode } from '~/types/form';
import { ensureFormLayout } from '~/lib/admin/form-layout';

export type SubmissionFieldMeta = {
  id: string;
  type: string;
  label: string;
};

export type SubmissionDisplayRow = {
  id: string;
  type: string;
  label: string;
  valueText: string;
  /** Raw value for copy / link href construction */
  raw: unknown;
};

function formatValue(raw: unknown): string {
  if (raw == null) return '';
  if (typeof raw === 'boolean') return raw ? 'yes' : 'no';
  if (Array.isArray(raw)) return raw.map((x) => String(x)).join(', ');
  if (typeof raw === 'object') {
    try {
      return JSON.stringify(raw);
    } catch {
      return String(raw);
    }
  }
  return String(raw);
}

function metaFromLayout(layout: unknown): SubmissionFieldMeta[] {
  const doc = ensureFormLayout(layout);
  const out: SubmissionFieldMeta[] = [];
  for (const row of doc.rows) {
    for (const field of row.fields as FormFieldNode[]) {
      if (field.type === 'hidden') continue;
      out.push({
        id: field.id,
        type: field.type,
        label: String(field.settings?.label || field.type),
      });
    }
  }
  return out;
}

function metaFromPayload(payload: Record<string, unknown>): SubmissionFieldMeta[] | null {
  const fields = payload.fields;
  if (!Array.isArray(fields) || fields.length === 0) return null;
  const out: SubmissionFieldMeta[] = [];
  for (const item of fields) {
    if (!item || typeof item !== 'object') continue;
    const f = item as Record<string, unknown>;
    const id = String(f.id || '');
    const type = String(f.type || 'text');
    if (!id || type === 'hidden') continue;
    out.push({
      id,
      type,
      label: String(f.label || type),
    });
  }
  return out.length ? out : null;
}

/**
 * Build labeled display rows for a submission payload.
 * Prefers snapshot `fields` in the payload; falls back to the current form layout.
 */
export function buildSubmissionDisplayRows(
  payload: Record<string, unknown>,
  formLayout?: unknown,
): SubmissionDisplayRow[] {
  const values =
    payload.values && typeof payload.values === 'object'
      ? (payload.values as Record<string, unknown>)
      : {};
  const labeled =
    payload.labeled && typeof payload.labeled === 'object'
      ? (payload.labeled as Record<string, unknown>)
      : {};

  const meta = metaFromPayload(payload) ?? (formLayout ? metaFromLayout(formLayout) : []);
  const rows: SubmissionDisplayRow[] = [];
  const seenIds = new Set<string>();
  const seenValues = new Set<string>();

  for (const field of meta) {
    if (!Object.prototype.hasOwnProperty.call(values, field.id)) continue;
    const raw = values[field.id];
    const valueText = formatValue(raw);
    if (valueText === '' && raw !== 0 && raw !== false) continue;
    seenIds.add(field.id);
    seenValues.add(valueText);
    // Prefer human label captured at submit time when it matches this value.
    let label = field.label;
    for (const [lab, val] of Object.entries(labeled)) {
      if (formatValue(val) === valueText && lab.trim()) {
        label = lab;
        break;
      }
    }
    rows.push({
      id: field.id,
      type: field.type,
      label,
      valueText,
      raw,
    });
  }

  // Orphan labeled entries (layout changed / no meta).
  for (const [lab, val] of Object.entries(labeled)) {
    const valueText = formatValue(val);
    if (!lab.trim() || valueText === '') continue;
    if (seenValues.has(valueText)) continue;
    const typeGuess =
      typeof val === 'string' && val.includes('@') && !val.includes(' ')
        ? 'email'
        : 'text';
    rows.push({
      id: `labeled:${lab}`,
      type: typeGuess,
      label: lab,
      valueText,
      raw: val,
    });
  }

  // Last resort: raw values without labels.
  if (rows.length === 0) {
    for (const [id, raw] of Object.entries(values)) {
      const valueText = formatValue(raw);
      if (valueText === '') continue;
      rows.push({
        id,
        type: 'text',
        label: id,
        valueText,
        raw,
      });
    }
  }

  return rows;
}

export function submissionValueHref(type: string, valueText: string): string | null {
  const v = valueText.trim();
  if (!v) return null;
  if (type === 'email') {
    const email = v.replace(/^mailto:/i, '');
    return `mailto:${email}`;
  }
  if (type === 'tel') {
    const digits = v.replace(/[^\d+]/g, '');
    if (!digits) return null;
    return `tel:${digits}`;
  }
  if (type === 'url' && /^https?:\/\//i.test(v)) {
    return v;
  }
  if (type === 'file' && /^https?:\/\//i.test(v)) {
    return v;
  }
  return null;
}
