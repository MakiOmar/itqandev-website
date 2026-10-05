import type {
  PageLayoutBand,
  PageLayoutBlock,
  PageLayoutRow,
  PageSectionNode,
} from '~/lib/marketing/appearance-types';
import { isPageLayoutBand } from '~/lib/marketing/page-layout-utils';

/** Theme widget that marks where the record's own builder content goes. */
export const THEME_CONTENT_PLACEHOLDER = 'post_content';

function isLive(block: PageLayoutBlock): boolean {
  return block.enabled !== false;
}

function rowsBlocks(rows: PageLayoutRow[] | undefined): PageLayoutBlock[] {
  return (rows ?? []).flatMap((row) =>
    (row.columns ?? []).flatMap((col) =>
      (col.blocks ?? []).filter(isLive).flatMap((block) =>
        block.type === 'inner_band' ? [block, ...rowsBlocks(block.rows)] : [block],
      ),
    ),
  );
}

function hasPlaceholder(band: PageLayoutBand): boolean {
  return rowsBlocks(band.rows).some((b) => b.type === THEME_CONTENT_PLACEHOLDER);
}

/** The band holds nothing but the placeholder, so the content can replace the whole band. */
function isPlaceholderOnly(band: PageLayoutBand): boolean {
  const blocks = rowsBlocks(band.rows);
  return blocks.length === 1 && blocks[0].type === THEME_CONTENT_PLACEHOLDER;
}

function contentAsBlocks(content: PageSectionNode[]): PageLayoutBlock[] {
  return content.map((node) => {
    if (isPageLayoutBand(node)) {
      return {
        id: node.id,
        kind: 'inner',
        type: 'inner_band',
        enabled: node.enabled,
        hide_on: node.hide_on,
        styles: node.styles,
        settings: node.settings,
        rows: node.rows,
      };
    }
    return { id: node.id, type: node.type, enabled: node.enabled, settings: node.settings };
  });
}

function replaceInRows(rows: PageLayoutRow[], inserted: PageLayoutBlock[]): PageLayoutRow[] {
  return rows.map((row) => ({
    ...row,
    columns: (row.columns ?? []).map((col) => ({
      ...col,
      blocks: (col.blocks ?? []).flatMap((block) => {
        if (block.type === THEME_CONTENT_PLACEHOLDER && isLive(block)) return inserted;
        if (block.type === 'inner_band' && block.rows) {
          return [{ ...block, rows: replaceInRows(block.rows, inserted) }];
        }
        return [block];
      }),
    })),
  }));
}

/**
 * Wrap a record's builder content in a Theme Builder body.
 *
 * - A band holding only Post content is replaced by the content bands (full-width bands keep their width).
 * - Post content next to other widgets gets the content bands as inner bands in its column.
 * - A body without Post content shows the content after the template.
 */
export function mergeThemeBodyWithContent(
  themeBody: PageSectionNode[] | null | undefined,
  content: PageSectionNode[],
): PageSectionNode[] {
  if (!themeBody || themeBody.length === 0) return content;
  let placed = false;
  const out: PageSectionNode[] = [];
  for (const node of themeBody) {
    if (!isPageLayoutBand(node) || node.enabled === false || !hasPlaceholder(node)) {
      out.push(node);
      continue;
    }
    placed = true;
    if (isPlaceholderOnly(node)) {
      out.push(...content);
    } else {
      out.push({ ...node, rows: replaceInRows(node.rows, contentAsBlocks(content)) });
    }
  }
  return placed ? out : [...out, ...content];
}
