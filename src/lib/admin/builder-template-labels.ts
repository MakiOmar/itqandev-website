import { appearanceSectionLabel } from '~/lib/i18n/appearance-labels';
import { translateApp } from '~/lib/i18n/useTranslate';
import type { BuilderTemplateRow } from './builder-templates';

/** "Band" / "Row" / "Column", or the widget/kit name for block templates. */
export function builderTemplateKindLabel(
  lang: string,
  row: Pick<BuilderTemplateRow, 'kind' | 'block_type'>,
  registry: { type: string; label?: string }[] = [],
): string {
  if (row.kind !== 'block') return translateApp(lang, `pages.${row.kind}`);
  if (!row.block_type) return translateApp(lang, 'pages.templateKindBlock');
  const entry = registry.find((r) => r.type === row.block_type);
  return appearanceSectionLabel(lang, row.block_type, entry?.label || row.block_type);
}
