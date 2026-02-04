import type { DashboardExtension } from './types';

/**
 * Extension registry
 * Stores all registered extensions
 */
class ExtensionRegistry {
  private extensions: DashboardExtension[] = [];

  /**
   * Register an extension
   */
  register(extension: DashboardExtension): void {
    this.extensions.push(extension);
  }

  /**
   * Register multiple extensions
   */
  registerMany(extensions: DashboardExtension[]): void {
    this.extensions.push(...extensions);
  }

  /**
   * Get all registered extensions
   */
  getAll(): DashboardExtension[] {
    return [...this.extensions];
  }

  /**
   * Get all route extensions
   */
  getRoutes(): DashboardExtension['routes'] {
    return this.extensions.flatMap((ext) => ext.routes || []);
  }

  /**
   * Get all menu item extensions
   */
  getMenuItems(): DashboardExtension['menuItems'] {
    return this.extensions.flatMap((ext) => ext.menuItems || []);
  }

  /**
   * Get all widget extensions
   */
  getWidgets(): DashboardExtension['widgets'] {
    return this.extensions.flatMap((ext) => ext.widgets || []);
  }

  /**
   * Get all component extensions
   */
  getComponents(): DashboardExtension['components'] {
    return this.extensions.flatMap((ext) => ext.components || []);
  }

  /**
   * Get all API endpoint extensions
   */
  getApiEndpoints(): DashboardExtension['apiEndpoints'] {
    return this.extensions.flatMap((ext) => ext.apiEndpoints || []);
  }

  /**
   * Get all guard extensions
   */
  getGuards(): DashboardExtension['guards'] {
    return this.extensions.flatMap((ext) => ext.guards || []);
  }

  /**
   * Clear all extensions
   */
  clear(): void {
    this.extensions = [];
  }
}

/**
 * Global extension registry instance
 */
export const extensionRegistry = new ExtensionRegistry();

/**
 * Register an extension
 */
export function registerExtension(extension: DashboardExtension): void {
  extensionRegistry.register(extension);
}

/**
 * Register multiple extensions
 */
export function registerExtensions(extensions: DashboardExtension[]): void {
  extensionRegistry.registerMany(extensions);
}

/**
 * Get all extensions
 */
export function getExtensions(): DashboardExtension[] {
  return extensionRegistry.getAll();
}

// Export convenience functions
export const extensions = {
  routes: () => extensionRegistry.getRoutes(),
  menuItems: () => extensionRegistry.getMenuItems(),
  widgets: () => extensionRegistry.getWidgets(),
  components: () => extensionRegistry.getComponents(),
  apiEndpoints: () => extensionRegistry.getApiEndpoints(),
  guards: () => extensionRegistry.getGuards(),
  clear: () => extensionRegistry.clear(),
};
