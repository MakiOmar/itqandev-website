/**
 * Payload for GET /api/public/menus/{slug} (resolved labels + locale-prefixed hrefs).
 */
export interface PublicNavItem {
  label: string;
  href: string;
  open_in_new_tab: boolean;
  children?: PublicNavItem[];
}
