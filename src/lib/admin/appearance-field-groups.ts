import type { AppearanceSettingField } from '~/lib/marketing/appearance-types';

export type AppearanceFieldGroup = {
  id: string;
  fields: AppearanceSettingField[];
};

const UNGROUPED_ID = 'general';

export function hasAppearanceFieldGroups(fields: AppearanceSettingField[]): boolean {
  return fields.some((field) => typeof field.group === 'string' && field.group !== '');
}

/** Groups fields in the order each group first appears; fields without a group share one "general" group. */
export function groupAppearanceFields(fields: AppearanceSettingField[]): AppearanceFieldGroup[] {
  const groups: AppearanceFieldGroup[] = [];
  const byId = new Map<string, AppearanceFieldGroup>();
  for (const field of fields) {
    const id = field.group || UNGROUPED_ID;
    let group = byId.get(id);
    if (!group) {
      group = { id, fields: [] };
      byId.set(id, group);
      groups.push(group);
    }
    group.fields.push(field);
  }
  return groups;
}

export function isAppearanceSettingOn(values: Record<string, unknown>, key: string): boolean {
  const value = values[key];
  return value === true || value === 'true' || value === 1 || value === '1';
}

/** `show_if` names a boolean setting; dependents stay hidden while it (or any toggle it depends on) is off. */
export function isAppearanceFieldVisible(
  field: AppearanceSettingField,
  fields: AppearanceSettingField[],
  values: Record<string, unknown>,
): boolean {
  const seen = new Set<string>();
  let current: AppearanceSettingField | undefined = field;
  while (current?.show_if && !seen.has(current.show_if)) {
    seen.add(current.show_if);
    if (!isAppearanceSettingOn(values, current.show_if)) return false;
    const parentKey: string = current.show_if;
    current = fields.find((candidate) => candidate.key === parentKey);
  }
  return true;
}
