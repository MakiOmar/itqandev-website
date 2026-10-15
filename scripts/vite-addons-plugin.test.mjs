import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
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
