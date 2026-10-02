/**
 * Block-type groups for header/footer ("chrome") layouts, which offer the page builder's
 * widgets and kits next to their own chrome kits.
 */

/** Kits rendered by `ChromeKitView` (registry categories Header / Footer). */
export const CHROME_KIT_TYPES: ReadonlySet<string> = new Set([
  'header_brand',
  'header_menu',
  'header_cta',
  'header_actions',
  'header_theme_toggle',
  'header_language_switcher',
  'header_account',
  'header_spacer',
  'footer_brand',
  'footer_menu',
  'footer_links',
  'footer_contact',
  'footer_social',
  'footer_rich_text',
  'footer_cta',
  'footer_copyright',
]);

/**
 * Archive kits whose data is the current route's paginated query (`?page=`, category / skill
 * slug). A sitewide header/footer has no such query and would fight the page's own list.
 */
export const CHROME_EXCLUDED_BLOCK_TYPES: ReadonlySet<string> = new Set([
  'projects_list',
  'blog_posts_list',
]);

/** Kits that need marketing lists the public shell does not load; fetched after the block is visible. */
export const CHROME_DATA_KIT_TYPES: ReadonlySet<string> = new Set([
  'services_teaser',
  'case_studies',
  'testimonials',
  'testimonial_list',
  'tech_stack',
  'blog_preview',
]);

export function isChromeKitType(type: string): boolean {
  return CHROME_KIT_TYPES.has(type);
}

/** Registry categories that belong to the other chrome surface (a header offers no footer kits). */
export function chromeCategoryExcludedFrom(kind: 'header' | 'footer'): string {
  return kind === 'header' ? 'Footer' : 'Header';
}
