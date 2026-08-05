/**
 * Client-side default header/footer layout documents (mirrors HeaderBuilderService / FooterBuilderService).
 * Used when the public shell has no chrome sections (offline fallback).
 */

import type { PageSectionNode } from './appearance-types';
import type { PublicNavItem } from './public-menu';

function kitBlock(
  id: string,
  type: string,
  settings: Record<string, unknown> = {},
): Record<string, unknown> {
  return { id, kind: 'kit', type, enabled: true, settings };
}

/** Default header: brand | menu | spacer | cta | actions. */
export function defaultHeaderSections(menuItems: PublicNavItem[] = []): PageSectionNode[] {
  return [
    {
      id: 'band_header_main',
      type: 'layout',
      enabled: true,
      layout_width: 'full',
      settings: {},
      rows: [
        {
          id: 'band_header_main_row',
          stack_below: 'none',
          gap: 4,
          columns: [
            {
              id: 'col_header_brand',
              span: { mobile: 6, tablet: 3, desktop: 2 },
              blocks: [kitBlock('kit_header_brand', 'header_brand') as never],
            },
            {
              id: 'col_header_menu',
              span: { mobile: 12, tablet: 6, desktop: 5 },
              blocks: [
                kitBlock('kit_header_menu', 'header_menu', {
                  menu_slug: 'primary',
                  show_children_mobile: true,
                  items: menuItems,
                }) as never,
              ],
            },
            {
              id: 'col_header_spacer',
              span: { mobile: 12, tablet: 12, desktop: 1 },
              blocks: [kitBlock('kit_header_spacer', 'header_spacer') as never],
            },
            {
              id: 'col_header_cta',
              span: { mobile: 6, tablet: 3, desktop: 2 },
              blocks: [kitBlock('kit_header_cta', 'header_cta') as never],
            },
            {
              id: 'col_header_actions',
              span: { mobile: 6, tablet: 3, desktop: 2 },
              blocks: [kitBlock('kit_header_actions', 'header_actions') as never],
            },
          ],
        },
      ],
    },
  ];
}

/** Default footer: brand + copyright bar. */
export function defaultFooterSections(): PageSectionNode[] {
  return [
    {
      id: 'band_footer_main',
      type: 'layout',
      enabled: true,
      layout_width: 'boxed',
      settings: {},
      rows: [
        {
          id: 'band_footer_main_row',
          stack_below: 'tablet',
          gap: 4,
          columns: [
            {
              id: 'col_footer_brand',
              span: { mobile: 12, tablet: 6, desktop: 3 },
              blocks: [kitBlock('kit_footer_brand', 'footer_brand') as never],
            },
            {
              id: 'col_footer_links',
              span: { mobile: 12, tablet: 6, desktop: 3 },
              blocks: [kitBlock('kit_footer_links', 'footer_links') as never],
            },
            {
              id: 'col_footer_contact',
              span: { mobile: 12, tablet: 6, desktop: 3 },
              blocks: [
                kitBlock('kit_footer_contact', 'footer_contact') as never,
                kitBlock('kit_footer_social', 'footer_social', { title: '' }) as never,
              ],
            },
            {
              id: 'col_footer_cta',
              span: { mobile: 12, tablet: 6, desktop: 3 },
              blocks: [kitBlock('kit_footer_cta', 'footer_cta') as never],
            },
          ],
        },
      ],
    },
    {
      id: 'band_footer_bottom',
      type: 'layout',
      enabled: true,
      layout_width: 'boxed',
      settings: {},
      rows: [
        {
          id: 'band_footer_bottom_row',
          stack_below: 'none',
          gap: 4,
          columns: [
            {
              id: 'col_footer_copyright',
              span: { mobile: 12, tablet: 12, desktop: 12 },
              blocks: [kitBlock('kit_footer_copyright', 'footer_copyright') as never],
            },
          ],
        },
      ],
    },
  ];
}
