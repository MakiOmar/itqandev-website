import type { Component } from '@builder.io/qwik';

/** Props the host passes to an addon widget or kit (same as built-in atomic widgets). */
export type AddonWidgetProps = {
  type: string;
  settings: Record<string, unknown>;
  uiLocale: string;
  /** When true, sizing/radius come from the Style wrapper CSS variables. */
  styled?: boolean;
  pageContext?: { title: string; subtitle?: string; slug?: string };
};

/** Props for the screen mounted at `/{lang}/admin/addons/{module}/{...path}`. */
export type AddonAdminProps = {
  uiLocale: string;
  module: string;
  /** Segments after the module, e.g. `['orders', '12']`; empty on the addon home. */
  path: string[];
};

export type AddonWidgetMap = Record<string, Component<AddonWidgetProps>>;

export type AddonAdminScreenMap = Record<string, Component<AddonAdminProps>>;

/** One dashboard link from GET /api/settings `addons` (only enabled modules). */
export type AddonNavItem = {
  key: string;
  module: string;
  label: Record<string, string>;
  /** Locale-less, e.g. `/admin/addons/shop/orders/`. */
  href: string;
  permission: string | null;
};
