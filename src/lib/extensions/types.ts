import type { Component } from '@builder.io/qwik';
import type { Role } from '../constants/roles';

/**
 * Route extension for adding custom routes
 */
export interface RouteExtension {
  path: string;
  component: Component<any>;
  layout?: 'admin' | 'public' | 'none';
  roles?: Role[];
  meta?: {
    title?: string;
    description?: string;
  };
}

/**
 * Menu item extension for sidebar navigation
 */
export interface MenuItemExtension {
  label: string;
  href: string;
  icon?: Component<any>;
  roles?: Role[];
  order?: number;
  badge?: string | number;
  children?: MenuItemExtension[];
}

/**
 * Dashboard widget extension
 */
export interface WidgetExtension {
  id: string;
  component: Component<any>;
  position: 'dashboard' | 'sidebar' | 'header';
  roles?: Role[];
  order?: number;
  config?: Record<string, any>;
}

/**
 * Component extension
 */
export interface ComponentExtension {
  name: string;
  component: Component<any>;
  replace?: boolean; // If true, replaces existing component with same name
}

/**
 * API endpoint extension
 */
export interface ApiEndpointExtension {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  handler: (req: any) => Promise<any>;
}

/**
 * Middleware/Guard extension
 */
export interface GuardExtension {
  name: string;
  check: (context: any) => Promise<boolean> | boolean;
  redirect?: string;
}

/**
 * Complete dashboard extension
 */
export interface DashboardExtension {
  routes?: RouteExtension[];
  menuItems?: MenuItemExtension[];
  widgets?: WidgetExtension[];
  components?: ComponentExtension[];
  apiEndpoints?: ApiEndpointExtension[];
  guards?: GuardExtension[];
}
