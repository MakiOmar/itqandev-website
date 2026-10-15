/**
 * Vite plugin: exposes installed addon packages to the app through two virtual modules.
 *
 * An addon is any dependency in package.json whose own package.json declares
 *   "itqandev": { "addon": { "module": "shop", "widgets": "./widgets", "admin": "./admin" } }
 * The host never names a product; with nothing installed both modules export empty maps.
 *
 * Entries are static imports of Qwik `component$` exports. Each component's render code is its
 * own lazy symbol chunk, so a page downloads an addon widget only when that block renders.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ADDON_WIDGETS_ID = 'virtual:itqandev-addon-widgets';
export const ADDON_ADMIN_ID = 'virtual:itqandev-addon-admin';

const RESOLVED_PREFIX = '\0';
const MODULE_KEY = /^[a-z][a-z0-9_]*$/;
const SUBPATH = /^\.\/[A-Za-z0-9_\-/]+$/;

/**
 * @param {string} file
 * @returns {Record<string, any> | null}
 */
function readJson(file) {
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * @typedef {{ name: string, module: string, widgets: string | null, admin: string | null }} AddonPackage
 * @param {{ root: string, modulesDir?: string }} options
 * @returns {AddonPackage[]}
 */
export function discoverAddons({ root, modulesDir = 'node_modules' }) {
  const pkg = readJson(join(root, 'package.json')) ?? {};
  const names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})].sort();
  /** @type {AddonPackage[]} */
  const out = [];
  const modules = new Set();
  for (const name of names) {
    const meta = readJson(join(root, modulesDir, ...name.split('/'), 'package.json'))?.itqandev?.addon;
    if (!meta) continue;
    const module = String(meta.module ?? '');
    if (!MODULE_KEY.test(module)) {
      throw new Error(`[itqandev-addons] ${name}: itqandev.addon.module must be snake_case.`);
    }
    if (modules.has(module)) {
      throw new Error(`[itqandev-addons] module key "${module}" is declared by more than one package.`);
    }
    modules.add(module);
    const subpath = (/** @type {unknown} */ value, /** @type {string} */ field) => {
      if (value == null) return null;
      if (typeof value !== 'string' || !SUBPATH.test(value)) {
        throw new Error(`[itqandev-addons] ${name}: itqandev.addon.${field} must be a "./subpath" export.`);
      }
      return `${name}/${value.slice(2)}`;
    };
    out.push({ name, module, widgets: subpath(meta.widgets, 'widgets'), admin: subpath(meta.admin, 'admin') });
  }
  return out;
}

/** @param {AddonPackage[]} addons */
export function widgetsModuleSource(addons) {
  const withWidgets = addons.filter((a) => a.widgets);
  const imports = withWidgets.map((a, i) => `import * as a${i} from ${JSON.stringify(a.widgets)};`);
  const widgets = withWidgets.map((_, i) => `...(a${i}.widgets ?? {})`).join(', ');
  const kits = withWidgets.map((_, i) => `...(a${i}.kits ?? {})`).join(', ');
  return [
    ...imports,
    `export const addonWidgets = { ${widgets} };`,
    `export const addonKits = { ${kits} };`,
    '',
  ].join('\n');
}

/** @param {AddonPackage[]} addons */
export function adminModuleSource(addons) {
  const withAdmin = addons.filter((a) => a.admin);
  const imports = withAdmin.map((a, i) => `import * as a${i} from ${JSON.stringify(a.admin)};`);
  const screens = withAdmin.map((a, i) => `${JSON.stringify(a.module)}: a${i}.AdminScreen`).join(', ');
  return [...imports, `export const addonAdminScreens = { ${screens} };`, ''].join('\n');
}

/**
 * @param {{ root: string }} options
 * @returns {import('vite').Plugin & { addonPackages: string[] }}
 */
export function itqandevAddons({ root }) {
  const addons = discoverAddons({ root });
  return {
    name: 'itqandev-addons',
    enforce: 'pre',
    addonPackages: addons.map((a) => a.name),
    resolveId(id) {
      return id === ADDON_WIDGETS_ID || id === ADDON_ADMIN_ID ? RESOLVED_PREFIX + id : undefined;
    },
    load(id) {
      if (id === RESOLVED_PREFIX + ADDON_WIDGETS_ID) return widgetsModuleSource(addons);
      if (id === RESOLVED_PREFIX + ADDON_ADMIN_ID) return adminModuleSource(addons);
      return undefined;
    },
  };
}
