import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import {
  ADDON_ADMIN_ID,
  ADDON_WIDGETS_ID,
  adminModuleSource,
  discoverAddons,
  itqandevAddons,
  linkedAddonDirs,
  resolveHostModule,
  widgetsModuleSource,
} from './vite-addons-plugin.mjs';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'addon-host');

test('no installed addon yields empty virtual modules', () => {
  const root = mkdtempSync(join(tmpdir(), 'addon-host-'));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: { 'plain-package': '1.0.0' } }));
  const plugin = itqandevAddons({ root });
  assert.deepEqual(plugin.addonPackages, []);
  assert.equal(plugin.load('\0' + ADDON_WIDGETS_ID), 'export const addonWidgets = {  };\nexport const addonKits = {  };\n');
  assert.equal(plugin.load('\0' + ADDON_ADMIN_ID), 'export const addonAdminScreens = {  };\n');
});

test('discovers only dependencies that declare itqandev.addon', () => {
  const addons = discoverAddons({ root: fixtureRoot, modulesDir: 'packages' });
  assert.deepEqual(addons, [
    {
      name: '@fixture/sample-addon',
      module: 'sample_addon',
      widgets: '@fixture/sample-addon/widgets',
      admin: '@fixture/sample-addon/admin',
    },
  ]);
});

test('generated modules import the package subpaths statically', () => {
  const addons = discoverAddons({ root: fixtureRoot, modulesDir: 'packages' });
  const widgets = widgetsModuleSource(addons);
  assert.match(widgets, /import \* as a0 from "@fixture\/sample-addon\/widgets";/);
  assert.match(widgets, /export const addonWidgets = \{ \.\.\.\(a0\.widgets \?\? \{\}\) \};/);
  assert.match(adminModuleSource(addons), /"sample_addon": a0\.AdminScreen/);
});

test('virtual ids resolve only for the addon modules', () => {
  const plugin = itqandevAddons({ root: fixtureRoot });
  assert.equal(plugin.resolveId(ADDON_WIDGETS_ID), '\0' + ADDON_WIDGETS_ID);
  assert.equal(plugin.resolveId('some-other-module'), undefined);
});

test('host modules resolve to the curated folder and nothing else', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  assert.equal(
    resolveHostModule(root, '@itqandev/host/api'),
    join(root, 'src', 'lib', 'addons', 'host', 'api.ts').replaceAll('\\', '/'),
  );
  assert.equal(resolveHostModule(root, 'lodash'), undefined);
  assert.throws(() => resolveHostModule(root, '@itqandev/host/../client'), /unknown host module/);
  assert.throws(() => resolveHostModule(root, '@itqandev/host/missing'), /unknown host module/);
});

test('only addons outside the app folder need a dev-server allow entry', () => {
  const outside = mkdtempSync(join(tmpdir(), 'addon-linked-'));
  const root = mkdtempSync(join(tmpdir(), 'addon-app-'));
  mkdirSync(join(root, 'node_modules', 'inside-addon'), { recursive: true });
  mkdirSync(join(root, 'node_modules', '@acme'), { recursive: true });
  symlinkSync(outside, join(root, 'node_modules', '@acme', 'linked-addon'), 'junction');
  const addons = [
    { name: 'inside-addon', module: 'inside', widgets: null, admin: null },
    { name: '@acme/linked-addon', module: 'linked', widgets: null, admin: null },
  ];
  assert.deepEqual(linkedAddonDirs(root, addons), [realpathSync(outside)]);
});

test('package.json files saved with a BOM are still read', () => {
  const root = mkdtempSync(join(tmpdir(), 'addon-bom-'));
  mkdirSync(join(root, 'node_modules', 'bom-addon'), { recursive: true });
  writeFileSync(join(root, 'package.json'), '\uFEFF' + JSON.stringify({ dependencies: { 'bom-addon': '1.0.0' } }));
  writeFileSync(
    join(root, 'node_modules', 'bom-addon', 'package.json'),
    '\uFEFF' + JSON.stringify({ name: 'bom-addon', itqandev: { addon: { module: 'bom', widgets: './widgets' } } }),
  );
  assert.deepEqual(discoverAddons({ root }), [{ name: 'bom-addon', module: 'bom', widgets: 'bom-addon/widgets', admin: null }]);
});
