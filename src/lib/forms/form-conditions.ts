/** Client mirror of FormConditionDocument::isVisible (AND/OR groups). */

export type FormConditionRule = {
  field?: string;
  op?: string;
  value?: string;
};

export type FormConditionGroup = {
  relation?: string;
  rules?: FormConditionRule[];
};

export function isFormFieldVisible(
  conditions: unknown,
  values: Record<string, string>,
): boolean {
  if (!conditions || typeof conditions !== 'object') return true;
  const group = conditions as FormConditionGroup;
  const rules = Array.isArray(group.rules) ? group.rules : [];
  if (rules.length === 0) return true;
  const relation = group.relation === 'or' ? 'or' : 'and';
  const results = rules.map((rule) => {
    const hay = String(values[String(rule.field || '')] ?? '');
    const want = String(rule.value ?? '');
    const op = String(rule.op || 'equals');
    if (op === 'empty') return hay.trim() === '';
    if (op === 'not_empty') return hay.trim() !== '';
    if (op === 'contains') return want !== '' && hay.toLowerCase().includes(want.toLowerCase());
    return hay.toLowerCase() === want.toLowerCase();
  });
  if (relation === 'or') return results.includes(true);
  return !results.includes(false);
}
