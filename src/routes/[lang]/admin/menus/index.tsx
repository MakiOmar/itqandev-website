import { component$, useSignal, useStore, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, useLocation } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../../components/common/LoadingSpinner';
import { useTranslate, translateApp } from '../../../../lib/i18n/useTranslate';
import { useSwal } from '../../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../../lib/api/client';
import { API_ENDPOINTS } from '../../../../lib/api/endpoints';
import { auth } from '../../../../lib/auth';
import type { AuthSession } from '../../../../lib/auth/types';
import { routesFromPreferredCookie } from '../../../../lib/constants/routes';
import { uiLangFromUrlPathname } from '../../../../lib/i18n/ui-locale-path';

interface MenuRow {
  id: number;
  name: string;
  slug: string;
}

interface MenuItemNode {
  id: number;
  parent_id: number | null;
  sort_order: number;
  label: string | null;
  item_type: string;
  url: string | null;
  static_route_key: string | null;
  reference_id: number | null;
  open_in_new_tab: boolean;
  children: MenuItemNode[];
}

interface MenuDetail {
  id: number;
  name: string;
  slug: string;
  items: MenuItemNode[];
}

interface PickerProject {
  id: number;
  title: string;
}

interface PickerPost {
  id: number;
  title: string;
}

interface PickerService {
  id: number;
  name: string;
}

interface PickerTax {
  id: number;
  name: string;
  slug: string;
}

type MenuItemType =
  | 'custom_link'
  | 'static_route'
  | 'project'
  | 'blog_post'
  | 'service'
  | 'category'
  | 'skill';

function collectMenuItemRefs(roots: MenuItemNode[]): Array<{ item_type: string; reference_id: number | null }> {
  const out: Array<{ item_type: string; reference_id: number | null }> = [];
  const walk = (nodes: MenuItemNode[]) => {
    for (const n of nodes) {
      out.push({ item_type: n.item_type, reference_id: n.reference_id });
      if (n.children?.length) {
        walk(n.children);
      }
    }
  };
  walk(roots);
  return out;
}

function menuHasItemRef(roots: MenuItemNode[], itemType: string, refId: number): boolean {
  return collectMenuItemRefs(roots).some((r) => r.item_type === itemType && r.reference_id === refId);
}

const MENU_SLUG_MAX = 64;

/** Lowercase `[a-z0-9_-]+` for Laravel `menus.slug` (non‑ASCII names → `menu`, then uniquified). */
function slugifyMenuSlugFromName(name: string): string {
  let s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!s) {
    s = 'menu';
  }
  if (s.length > MENU_SLUG_MAX) {
    s = s.slice(0, MENU_SLUG_MAX).replace(/-+$/g, '');
  }
  return s || 'menu';
}

/** Ensures slug is not already used by another menu (`base`, `base-2`, …). */
function uniqueMenuSlug(base: string, existing: readonly MenuRow[]): string {
  const slugs = new Set(existing.map((m) => m.slug));
  if (!slugs.has(base)) {
    return base;
  }
  let i = 2;
  while (i < 1_000_000) {
    const suffix = `-${i}`;
    const room = Math.max(1, MENU_SLUG_MAX - suffix.length);
    const truncated = base.slice(0, room).replace(/-+$/g, '') || 'm';
    const candidate = `${truncated}${suffix}`;
    if (!slugs.has(candidate)) {
      return candidate;
    }
    i += 1;
  }
  return `${base.slice(0, 20)}-${Date.now()}`;
}

const STATIC_ROUTE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'home', label: 'Home' },
  { value: 'services', label: 'Services' },
  { value: 'work', label: 'Work' },
  { value: 'about', label: 'About' },
  { value: 'pricing', label: 'Pricing' },
  { value: 'blog', label: 'Blog' },
  { value: 'contact', label: 'Contact' },
];

function canManageMenus(session: AuthSession | null): boolean {
  if (!session?.user) {
    return false;
  }
  const roles = ['super_admin', 'admin', 'company', 'editor'];
  if (roles.includes(session.user.role)) {
    return true;
  }
  return (session.user.permissions ?? []).includes('manage menus');
}

function extractRows(res: unknown): unknown[] {
  const body = (res as { data?: unknown })?.data ?? res;
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === 'object' && 'data' in (body as object) && Array.isArray((body as { data: unknown }).data)) {
    return (body as { data: unknown[] }).data;
  }
  return [];
}

function extractMenuDetail(res: unknown): MenuDetail | null {
  const d = (res as { data?: unknown })?.data;
  if (!d || typeof d !== 'object') {
    return null;
  }
  const o = d as Record<string, unknown>;
  const id = o.id;
  if (typeof id !== 'number' && typeof id !== 'string') {
    return null;
  }
  const items = Array.isArray(o.items) ? (o.items as MenuItemNode[]) : [];
  return {
    id: Number(id),
    name: String(o.name ?? ''),
    slug: String(o.slug ?? ''),
    items,
  };
}

export const useMenusAdminPage = routeLoader$(async ({ cookie, request, redirect: redirectFn }) => {
  const R = routesFromPreferredCookie(cookie);
  const session = await auth.getSession(cookie);
  if (!canManageMenus(session)) {
    throw redirectFn(302, R.ADMIN.HOME);
  }

  const api = getApiClient(extractCookieHeader(cookie, request) ?? undefined);
  try {
    const listRes = await api.get(API_ENDPOINTS.MENUS.LIST);
    const raw = extractRows(listRes) as Record<string, unknown>[];
    const menus: MenuRow[] = raw.map((m) => ({
      id: Number(m.id),
      name: String(m.name ?? ''),
      slug: String(m.slug ?? ''),
    }));
    const primary = menus.find((m) => m.slug === 'primary') ?? menus[0] ?? null;
    let menuDetail: MenuDetail | null = null;
    if (primary) {
      const detailRes = await api.get(API_ENDPOINTS.MENUS.GET(primary.id));
      menuDetail = extractMenuDetail(detailRes);
    }
    return { menus, menuDetail, selectedMenuId: primary?.id ?? null };
  } catch {
    return { menus: [] as MenuRow[], menuDetail: null, selectedMenuId: null };
  }
});

export default component$(() => {
  const pageData = useMenusAdminPage();
  const location = useLocation();
  const { lang } = useTranslate();
  const { confirm, success, error: showError } = useSwal();

  const menuDetail = useSignal<MenuDetail | null>(pageData.value.menuDetail);
  const selectedMenuId = useSignal<number | null>(pageData.value.selectedMenuId);
  const loadingDetail = useSignal(false);
  const saving = useSignal(false);

  const menusList = useSignal<MenuRow[]>([...pageData.value.menus]);
  const showCreateMenuForm = useSignal(pageData.value.menus.length === 0);
  const newMenuShell = useStore({
    name: '',
  });

  const projects = useSignal<PickerProject[]>([]);
  const blogPosts = useSignal<PickerPost[]>([]);
  const services = useSignal<PickerService[]>([]);
  const categories = useSignal<PickerTax[]>([]);
  const skills = useSignal<PickerTax[]>([]);

  const bulkRowPick = useStore({ m: {} as Record<number, boolean> });
  const taxCatPick = useStore({ m: {} as Record<number, boolean> });
  const taxSkillPick = useStore({ m: {} as Record<number, boolean> });

  const form = useStore({
    id: null as number | null,
    parent_id: null as number | null,
    sort_order: 0,
    item_type: 'static_route' as MenuItemType,
    url: '',
    static_route_key: 'home',
    reference_id: '',
    label: '',
    open_in_new_tab: false,
  });

  const resetForm$ = $(() => {
    form.id = null;
    form.parent_id = null;
    form.sort_order = 0;
    form.item_type = 'static_route' as MenuItemType;
    form.url = '';
    form.static_route_key = 'home';
    form.reference_id = '';
    form.label = '';
    form.open_in_new_tab = false;
  });

  const fetchDetail$ = $(async (menuId: number) => {
    loadingDetail.value = true;
    try {
      const api = getApiClient();
      const res = await api.get(API_ENDPOINTS.MENUS.GET(menuId));
      menuDetail.value = extractMenuDetail(res);
    } catch {
      menuDetail.value = null;
      await showError(String(translateApp(lang, 'menusPage.loadFailed')));
    } finally {
      loadingDetail.value = false;
    }
  });

  const onMenuSelect$ = $(async (e: Event) => {
    const id = Number((e.target as HTMLSelectElement).value);
    if (!id || Number.isNaN(id)) {
      return;
    }
    selectedMenuId.value = id;
    bulkRowPick.m = {};
    taxCatPick.m = {};
    taxSkillPick.m = {};
    await fetchDetail$(id);
    await resetForm$();
  });

  const reloadMenusList$ = $(async (selectSlug?: string | null) => {
    const api = getApiClient();
    const listRes = await api.get(API_ENDPOINTS.MENUS.LIST);
    const raw = extractRows(listRes) as Record<string, unknown>[];
    const next: MenuRow[] = raw.map((m) => ({
      id: Number(m.id),
      name: String(m.name ?? ''),
      slug: String(m.slug ?? ''),
    }));
    menusList.value = next;
    let pickId: number | null = null;
    if (selectSlug) {
      const hit = next.find((m) => m.slug === selectSlug);
      if (hit) {
        pickId = hit.id;
      }
    }
    const current = selectedMenuId.value;
    if (pickId == null && current != null && next.some((m) => m.id === current)) {
      pickId = current;
    }
    if (pickId == null && next.length) {
      const primary = next.find((m) => m.slug === 'primary');
      pickId = primary?.id ?? next[0]!.id;
    }
    selectedMenuId.value = pickId;
    if (pickId != null) {
      await fetchDetail$(pickId);
    } else {
      menuDetail.value = null;
    }
  });

  const createMenu$ = $(async () => {
    const name = newMenuShell.name.trim();
    if (!name) {
      await showError(String(translateApp(lang, 'menusPage.nameRequired')));
      return;
    }
    const base = slugifyMenuSlugFromName(name);
    const slug = uniqueMenuSlug(base, menusList.value);
    saving.value = true;
    try {
      const api = getApiClient();
      await api.post(API_ENDPOINTS.MENUS.CREATE, { name, slug });
      newMenuShell.name = '';
      showCreateMenuForm.value = false;
      await success(String(translateApp(lang, 'menusPage.menuCreated')));
      await reloadMenusList$(slug);
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const deleteMenu$ = $(async () => {
    const mid = selectedMenuId.value;
    if (mid == null) {
      return;
    }
    const row = menusList.value.find((m) => m.id === mid);
    const nameLabel = row?.name ?? String(mid);
    const r = await confirm(String(translateApp(lang, 'menusPage.deleteMenuConfirm', { name: nameLabel })), {
      icon: 'warning',
      title: String(translateApp(lang, 'menusPage.deleteTitle')),
    });
    if (!r.isConfirmed) {
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      await api.delete(API_ENDPOINTS.MENUS.DELETE(mid));
      await success(String(translateApp(lang, 'menusPage.menuDeleted')));
      await resetForm$();
      await reloadMenusList$(null);
      if (menusList.value.length === 0) {
        showCreateMenuForm.value = true;
      }
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const persistReorder$ = $(async (orderedRoots: MenuItemNode[]) => {
    const mid = selectedMenuId.value;
    if (!mid) {
      return;
    }
    const api = getApiClient();
    await api.put(API_ENDPOINTS.MENUS.REORDER_ITEMS(mid), {
      items: orderedRoots.map((item, index) => ({
        id: item.id,
        parent_id: null,
        sort_order: index,
      })),
    });
    await fetchDetail$(mid);
  });

  const moveUp$ = $(async (index: number) => {
    const raw = menuDetail.value?.items ?? [];
    const list = raw.length ? [...raw] : [];
    if (index <= 0) {
      return;
    }
    saving.value = true;
    try {
      const tmp = list[index - 1];
      list[index - 1] = list[index];
      list[index] = tmp;
      await persistReorder$(list);
      await success(String(translateApp(lang, 'menusPage.reordered')));
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const moveDown$ = $(async (index: number) => {
    const raw = menuDetail.value?.items ?? [];
    const list = raw.length ? [...raw] : [];
    if (index >= list.length - 1) {
      return;
    }
    saving.value = true;
    try {
      const tmp = list[index + 1];
      list[index + 1] = list[index];
      list[index] = tmp;
      await persistReorder$(list);
      await success(String(translateApp(lang, 'menusPage.reordered')));
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const saveItem$ = $(async () => {
    const mid = selectedMenuId.value;
    if (!mid) {
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      const payload: Record<string, unknown> = {
        parent_id: form.parent_id,
        sort_order: Number(form.sort_order) || 0,
        label: form.label.trim() || null,
        item_type: form.item_type,
        open_in_new_tab: form.open_in_new_tab,
      };
      if (form.item_type === 'custom_link') {
        payload.url = form.url.trim();
      }
      if (form.item_type === 'static_route') {
        payload.static_route_key = form.static_route_key;
      }
      if (['project', 'blog_post', 'service', 'category', 'skill'].includes(form.item_type)) {
        payload.reference_id = parseInt(String(form.reference_id), 10);
      }
      if (form.id) {
        await api.put(API_ENDPOINTS.MENUS.UPDATE_ITEM(form.id), payload);
        await success(String(translateApp(lang, 'menusPage.saved')));
      } else {
        await api.post(API_ENDPOINTS.MENUS.CREATE_ITEM(mid), payload);
        await success(String(translateApp(lang, 'menusPage.added')));
        await resetForm$();
      }
      await fetchDetail$(mid);
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const editItem$ = $((item: MenuItemNode) => {
    form.id = item.id;
    form.parent_id = item.parent_id;
    form.sort_order = item.sort_order;
    form.label = item.label || '';
    form.item_type = item.item_type as MenuItemType;
    form.url = item.url || '';
    form.static_route_key = item.static_route_key || 'home';
    form.reference_id = item.reference_id != null ? String(item.reference_id) : '';
    form.open_in_new_tab = !!item.open_in_new_tab;
  });

  const toggleRowBulk$ = $((id: number) => {
    bulkRowPick.m[id] = !bulkRowPick.m[id];
  });

  const toggleTaxCat$ = $((id: number) => {
    taxCatPick.m[id] = !taxCatPick.m[id];
  });

  const toggleTaxSkill$ = $((id: number) => {
    taxSkillPick.m[id] = !taxSkillPick.m[id];
  });

  const selectAllRootItems$ = $(() => {
    const roots = menuDetail.value?.items ?? [];
    for (const i of roots) {
      bulkRowPick.m[i.id] = true;
    }
  });

  const clearRowBulk$ = $(() => {
    bulkRowPick.m = {};
  });

  const bulkDeleteItems$ = $(async () => {
    const ids = Object.entries(bulkRowPick.m)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    if (!ids.length) {
      await showError(String(translateApp(lang, 'menusPage.nothingSelectedItems')));
      return;
    }
    const r = await confirm(String(translateApp(lang, 'menusPage.bulkDeleteConfirm', { count: ids.length })), {
      icon: 'warning',
      title: String(translateApp(lang, 'menusPage.deleteTitle')),
    });
    if (!r.isConfirmed) {
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      for (const id of ids) {
        await api.delete(API_ENDPOINTS.MENUS.DELETE_ITEM(id));
      }
      if (form.id && ids.includes(form.id)) {
        await resetForm$();
      }
      bulkRowPick.m = {};
      const mid = selectedMenuId.value;
      if (mid) {
        await fetchDetail$(mid);
      }
      await success(String(translateApp(lang, 'menusPage.bulkDeleted')));
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const addSelectedCategories$ = $(async () => {
    const mid = selectedMenuId.value;
    if (!mid) {
      return;
    }
    const roots = menuDetail.value?.items ?? [];
    const rawIds = Object.entries(taxCatPick.m)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    const idSet = [...new Set(rawIds)];
    if (!idSet.length) {
      await showError(String(translateApp(lang, 'menusPage.nothingSelectedTaxonomy')));
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      let added = 0;
      for (const refId of idSet) {
        if (menuHasItemRef(roots, 'category', refId)) {
          continue;
        }
        await api.post(API_ENDPOINTS.MENUS.CREATE_ITEM(mid), {
          item_type: 'category',
          reference_id: refId,
          open_in_new_tab: false,
          label: null,
        });
        added += 1;
      }
      taxCatPick.m = {};
      if (added > 0) {
        await success(String(translateApp(lang, 'menusPage.taxonomyAdded', { count: added })));
      } else {
        await showError(String(translateApp(lang, 'menusPage.taxonomyAllSkipped')));
      }
      await fetchDetail$(mid);
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const addSelectedSkills$ = $(async () => {
    const mid = selectedMenuId.value;
    if (!mid) {
      return;
    }
    const roots = menuDetail.value?.items ?? [];
    const rawIds = Object.entries(taxSkillPick.m)
      .filter(([, v]) => v)
      .map(([k]) => Number(k));
    const idSet = [...new Set(rawIds)];
    if (!idSet.length) {
      await showError(String(translateApp(lang, 'menusPage.nothingSelectedTaxonomy')));
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      let added = 0;
      for (const refId of idSet) {
        if (menuHasItemRef(roots, 'skill', refId)) {
          continue;
        }
        await api.post(API_ENDPOINTS.MENUS.CREATE_ITEM(mid), {
          item_type: 'skill',
          reference_id: refId,
          open_in_new_tab: false,
          label: null,
        });
        added += 1;
      }
      taxSkillPick.m = {};
      if (added > 0) {
        await success(String(translateApp(lang, 'menusPage.taxonomyAdded', { count: added })));
      } else {
        await showError(String(translateApp(lang, 'menusPage.taxonomyAllSkipped')));
      }
      await fetchDetail$(mid);
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  const deleteItem$ = $(async (item: MenuItemNode) => {
    const r = await confirm(String(translateApp(lang, 'menusPage.deleteConfirm')), {
      icon: 'warning',
      title: String(translateApp(lang, 'menusPage.deleteTitle')),
    });
    if (!r.isConfirmed) {
      return;
    }
    saving.value = true;
    try {
      const api = getApiClient();
      await api.delete(API_ENDPOINTS.MENUS.DELETE_ITEM(item.id));
      if (form.id === item.id) {
        await resetForm$();
      }
      const mid = selectedMenuId.value;
      if (mid) {
        await fetchDetail$(mid);
      }
      await success(String(translateApp(lang, 'menusPage.deleted')));
    } catch {
      await showError(String(translateApp(lang, 'menusPage.saveFailed')));
    } finally {
      saving.value = false;
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async ({ track }) => {
    const pathname = track(() => location.url.pathname);
    const presentationLocale = uiLangFromUrlPathname(pathname);
    const api = getApiClient(undefined, presentationLocale);
    try {
      const [pr, br, sr, cr, skr] = await Promise.all([
        api.get(API_ENDPOINTS.PROJECTS.LIST).catch(() => ({ data: [] })),
        api.get(API_ENDPOINTS.BLOG.LIST).catch(() => ({ data: [] })),
        api.get(API_ENDPOINTS.SERVICES.LIST).catch(() => ({ data: [] })),
        api.get(API_ENDPOINTS.CATEGORIES.LIST).catch(() => ({ data: [] })),
        api.get(API_ENDPOINTS.SKILLS.LIST).catch(() => ({ data: [] })),
      ]);
      const pRows = extractRows(pr) as Record<string, unknown>[];
      projects.value = pRows.map((r) => ({
        id: Number(r.id),
        title: String(r.title ?? ''),
      }));
      const bRows = extractRows(br) as Record<string, unknown>[];
      blogPosts.value = bRows.map((r) => ({
        id: Number(r.id),
        title: String(r.title ?? ''),
      }));
      const sRows = extractRows(sr) as Record<string, unknown>[];
      services.value = sRows.map((r) => ({
        id: Number(r.id),
        name: String(r.name ?? ''),
      }));
      const cRows = extractRows(cr) as Record<string, unknown>[];
      categories.value = cRows.map((r) => ({
        id: Number(r.id),
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
      }));
      const skRows = extractRows(skr) as Record<string, unknown>[];
      skills.value = skRows.map((r) => ({
        id: Number(r.id),
        name: String(r.name ?? ''),
        slug: String(r.slug ?? ''),
      }));
    } catch {
      projects.value = [];
      blogPosts.value = [];
      services.value = [];
      categories.value = [];
      skills.value = [];
    }
  });

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100';
  const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200';

  return (
    <>
      <div>
        <PageHeader
          title={String(translateApp(lang, 'menusPage.title'))}
          description={String(translateApp(lang, 'menusPage.subtitle'))}
        />

        {menusList.value.length === 0 ? (
          <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">{String(translateApp(lang, 'menusPage.emptyMenus'))}</p>
        ) : (
          <div class="mb-6 flex max-w-2xl flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div class="min-w-0 flex-1">
              <label class={labelClass} for="admin-menu-select">
                {String(translateApp(lang, 'menusPage.selectMenu'))}
              </label>
              <select
                id="admin-menu-select"
                class={inputClass}
                value={selectedMenuId.value ?? ''}
                onChange$={onMenuSelect$}
                disabled={saving.value}
              >
                {menusList.value.map((m) => (
                  <option key={m.id} value={m.id}>
                    {`${m.name} (${m.slug})`}
                  </option>
                ))}
              </select>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                disabled={saving.value}
                onClick$={() => {
                  showCreateMenuForm.value = true;
                }}
              >
                {String(translateApp(lang, 'menusPage.addAnotherMenu'))}
              </button>
              <button
                type="button"
                class="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                disabled={saving.value || selectedMenuId.value == null}
                onClick$={deleteMenu$}
              >
                {String(translateApp(lang, 'menusPage.deleteThisMenu'))}
              </button>
            </div>
          </div>
        )}

        {(menusList.value.length === 0 || showCreateMenuForm.value) && (
          <div class="mb-8 max-w-xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {String(translateApp(lang, 'menusPage.createMenuHeading'))}
            </h2>
            <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {String(translateApp(lang, 'menusPage.createMenuIntro'))}
            </p>
            <div class="grid gap-3">
              <div>
                <label class={labelClass} for="new-menu-name">
                  {String(translateApp(lang, 'menusPage.menuName'))}
                </label>
                <input
                  id="new-menu-name"
                  class={inputClass}
                  type="text"
                  value={newMenuShell.name}
                  placeholder="Primary"
                  onInput$={(e) => {
                    newMenuShell.name = (e.target as HTMLInputElement).value;
                  }}
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{String(translateApp(lang, 'menusPage.slugAutoHint'))}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving.value}
                  onClick$={createMenu$}
                >
                  {String(translateApp(lang, 'menusPage.createMenuButton'))}
                </button>
                {menusList.value.length > 0 ? (
                  <button
                    type="button"
                    class="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                    disabled={saving.value}
                    onClick$={() => {
                      showCreateMenuForm.value = false;
                      newMenuShell.name = '';
                    }}
                  >
                    {String(translateApp(lang, 'common.cancel'))}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {menusList.value.length > 0 && (
          <>
            <div class="grid gap-6 lg:grid-cols-2">
              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
                <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {String(translateApp(lang, 'menusPage.itemsHeading'))}
                </h2>
                {loadingDetail.value ? (
                  <LoadingSpinner />
                ) : (menuDetail.value?.items ?? []).length === 0 ? (
                  <p class="text-sm text-gray-500 dark:text-gray-400">{String(translateApp(lang, 'menusPage.emptyItems'))}</p>
                ) : (
                  <>
                    <div class="mb-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                        disabled={saving.value}
                        onClick$={selectAllRootItems$}
                      >
                        {String(translateApp(lang, 'menusPage.selectAllItems'))}
                      </button>
                      <button
                        type="button"
                        class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium dark:border-gray-600"
                        disabled={saving.value}
                        onClick$={clearRowBulk$}
                      >
                        {String(translateApp(lang, 'menusPage.clearSelection'))}
                      </button>
                      <button
                        type="button"
                        class="rounded border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-300"
                        disabled={saving.value}
                        onClick$={bulkDeleteItems$}
                      >
                        {String(translateApp(lang, 'menusPage.deleteSelected'))}
                      </button>
                    </div>
                    <ul class="divide-y divide-gray-200 dark:divide-gray-700">
                      {(menuDetail.value?.items ?? []).map((item, idx) => (
                        <li key={item.id} class="flex flex-wrap items-center gap-2 py-3">
                          <input
                            type="checkbox"
                            class="h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600"
                            checked={!!bulkRowPick.m[item.id]}
                            onChange$={() => toggleRowBulk$(item.id)}
                            aria-label={String(translateApp(lang, 'menusPage.selectItem'))}
                          />
                          <div class="min-w-0 flex-1">
                            <RowLabel
                              text={rowLabelSync(
                                item,
                                projects.value,
                                blogPosts.value,
                                services.value,
                                categories.value,
                                skills.value,
                                lang,
                              )}
                            />
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          {item.item_type}
                          {item.open_in_new_tab ? ` · ${String(translateApp(lang, 'menusPage.openNewTab'))}` : ''}
                        </div>
                      </div>
                      <div class="flex shrink-0 flex-wrap gap-1">
                        <button
                          type="button"
                          class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 disabled:opacity-50"
                          disabled={idx === 0 || saving.value}
                          onClick$={() => moveUp$(idx)}
                        >
                          {String(translateApp(lang, 'menusPage.moveUp'))}
                        </button>
                        <button
                          type="button"
                          class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 disabled:opacity-50"
                          disabled={idx >= (menuDetail.value?.items ?? []).length - 1 || saving.value}
                          onClick$={() => moveDown$(idx)}
                        >
                          {String(translateApp(lang, 'menusPage.moveDown'))}
                        </button>
                        <button
                          type="button"
                          class="rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
                          onClick$={() => editItem$(item)}
                        >
                          {String(translateApp(lang, 'common.edit'))}
                        </button>
                        <button
                          type="button"
                          class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 dark:border-red-900"
                          onClick$={() => deleteItem$(item)}
                        >
                          {String(translateApp(lang, 'menusPage.delete'))}
                        </button>
                      </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
              <h2 class="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {form.id
                  ? String(translateApp(lang, 'menusPage.editHeading'))
                  : String(translateApp(lang, 'menusPage.addHeading'))}
              </h2>

              <div class="grid gap-3 md:grid-cols-2">
                <div class="md:col-span-2">
                  <label class={labelClass}>{String(translateApp(lang, 'menusPage.linkType'))}</label>
                  <select
                    class={inputClass}
                    value={form.item_type}
                    onInput$={(e) => {
                      form.item_type = (e.target as HTMLSelectElement).value as MenuItemType;
                    }}
                  >
                    <option value="custom_link">{String(translateApp(lang, 'menusPage.typeCustom'))}</option>
                    <option value="static_route">{String(translateApp(lang, 'menusPage.typeStatic'))}</option>
                    <option value="project">{String(translateApp(lang, 'menusPage.typeProject'))}</option>
                    <option value="blog_post">{String(translateApp(lang, 'menusPage.typeBlog'))}</option>
                    <option value="service">{String(translateApp(lang, 'menusPage.typeService'))}</option>
                    <option value="category">{String(translateApp(lang, 'menusPage.typeCategory'))}</option>
                    <option value="skill">{String(translateApp(lang, 'menusPage.typeSkill'))}</option>
                  </select>
                </div>

                {form.item_type === 'custom_link' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.url'))}</label>
                    <input
                      class={inputClass}
                      type="text"
                      value={form.url}
                      placeholder="https:// or /path"
                      onInput$={(e) => {
                        form.url = (e.target as HTMLInputElement).value;
                      }}
                    />
                  </div>
                )}

                {form.item_type === 'static_route' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.staticPage'))}</label>
                    <select
                      class={inputClass}
                      value={form.static_route_key}
                      onInput$={(e) => {
                        form.static_route_key = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      {STATIC_ROUTE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.item_type === 'project' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.pickProject'))}</label>
                    <select
                      class={inputClass}
                      value={form.reference_id}
                      onInput$={(e) => {
                        form.reference_id = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      <option value="">{String(translateApp(lang, 'menusPage.pickPlaceholder'))}</option>
                      {projects.value.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.item_type === 'blog_post' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.pickPost'))}</label>
                    <select
                      class={inputClass}
                      value={form.reference_id}
                      onInput$={(e) => {
                        form.reference_id = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      <option value="">{String(translateApp(lang, 'menusPage.pickPlaceholder'))}</option>
                      {blogPosts.value.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.item_type === 'service' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.pickService'))}</label>
                    <select
                      class={inputClass}
                      value={form.reference_id}
                      onInput$={(e) => {
                        form.reference_id = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      <option value="">{String(translateApp(lang, 'menusPage.pickPlaceholder'))}</option>
                      {services.value.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.item_type === 'category' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.pickCategory'))}</label>
                    <select
                      class={inputClass}
                      value={form.reference_id}
                      onInput$={(e) => {
                        form.reference_id = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      <option value="">{String(translateApp(lang, 'menusPage.pickPlaceholder'))}</option>
                      {categories.value.map((c) => (
                        <option key={c.id} value={c.id}>
                          {`${c.name} (${c.slug})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.item_type === 'skill' && (
                  <div class="md:col-span-2">
                    <label class={labelClass}>{String(translateApp(lang, 'menusPage.pickSkill'))}</label>
                    <select
                      class={inputClass}
                      value={form.reference_id}
                      onInput$={(e) => {
                        form.reference_id = (e.target as HTMLSelectElement).value;
                      }}
                    >
                      <option value="">{String(translateApp(lang, 'menusPage.pickPlaceholder'))}</option>
                      {skills.value.map((s) => (
                        <option key={s.id} value={s.id}>
                          {`${s.name} (${s.slug})`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div class="md:col-span-2">
                  <label class={labelClass}>{String(translateApp(lang, 'menusPage.optionalLabel'))}</label>
                  <input
                    class={inputClass}
                    type="text"
                    value={form.label}
                    onInput$={(e) => {
                      form.label = (e.target as HTMLInputElement).value;
                    }}
                  />
                </div>

                <div class="md:col-span-2 flex items-center gap-2">
                  <input
                    id="menu-open-tab"
                    type="checkbox"
                    checked={form.open_in_new_tab}
                    onChange$={(e) => {
                      form.open_in_new_tab = (e.target as HTMLInputElement).checked;
                    }}
                  />
                  <label for="menu-open-tab" class="text-sm text-gray-700 dark:text-gray-200">
                    {String(translateApp(lang, 'menusPage.openNewTab'))}
                  </label>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                  disabled={saving.value || !selectedMenuId.value}
                  onClick$={saveItem$}
                >
                  {form.id
                    ? String(translateApp(lang, 'menusPage.updateButton'))
                    : String(translateApp(lang, 'menusPage.addButton'))}
                </button>
                {form.id ? (
                  <button
                    type="button"
                    class="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                    onClick$={resetForm$}
                  >
                    {String(translateApp(lang, 'common.cancel'))}
                  </button>
                ) : null}
              </div>
              </div>
            </div>

            <div class="mt-8 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
              <h2 class="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {String(translateApp(lang, 'menusPage.taxonomyHeading'))}
              </h2>
              <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {String(translateApp(lang, 'menusPage.taxonomyIntro'))}
              </p>
              <div class="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {String(translateApp(lang, 'menusPage.categoriesTaxonomy'))}
                  </h3>
                  <div class="max-h-56 space-y-2 overflow-y-auto rounded border border-gray-100 p-2 dark:border-gray-700">
                    {categories.value.length === 0 ? (
                      <p class="text-xs text-gray-500">{String(translateApp(lang, 'menusPage.taxonomyEmpty'))}</p>
                    ) : (
                      categories.value.map((c) => (
                        <label key={c.id} class="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            class="h-4 w-4 rounded border-gray-300"
                            checked={!!taxCatPick.m[c.id]}
                            onChange$={() => toggleTaxCat$(c.id)}
                          />
                          <span class="text-gray-800 dark:text-gray-200">{`${c.name} (${c.slug})`}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    class="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={saving.value || !selectedMenuId.value}
                    onClick$={addSelectedCategories$}
                  >
                    {String(translateApp(lang, 'menusPage.addSelectedCategories'))}
                  </button>
                </div>
                <div>
                  <h3 class="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {String(translateApp(lang, 'menusPage.skillsTaxonomy'))}
                  </h3>
                  <div class="max-h-56 space-y-2 overflow-y-auto rounded border border-gray-100 p-2 dark:border-gray-700">
                    {skills.value.length === 0 ? (
                      <p class="text-xs text-gray-500">{String(translateApp(lang, 'menusPage.taxonomyEmpty'))}</p>
                    ) : (
                      skills.value.map((s) => (
                        <label key={s.id} class="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            class="h-4 w-4 rounded border-gray-300"
                            checked={!!taxSkillPick.m[s.id]}
                            onChange$={() => toggleTaxSkill$(s.id)}
                          />
                          <span class="text-gray-800 dark:text-gray-200">{`${s.name} (${s.slug})`}</span>
                        </label>
                      ))
                    )}
                  </div>
                  <button
                    type="button"
                    class="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    disabled={saving.value || !selectedMenuId.value}
                    onClick$={addSelectedSkills$}
                  >
                    {String(translateApp(lang, 'menusPage.addSelectedSkills'))}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
});

function rowLabelSync(
  item: MenuItemNode,
  projects: PickerProject[],
  posts: PickerPost[],
  svcs: PickerService[],
  cats: PickerTax[],
  sks: PickerTax[],
  lang: string,
): string {
  if (item.label?.trim()) {
    return item.label.trim();
  }
  if (item.item_type === 'static_route' && item.static_route_key) {
    const m = STATIC_ROUTE_OPTIONS.find((x) => x.value === item.static_route_key);
    return m?.label ?? item.static_route_key;
  }
  if (item.item_type === 'custom_link') {
    return item.url || String(translateApp(lang, 'menusPage.typeCustom'));
  }
  if (item.item_type === 'project') {
    const p = projects.find((x) => x.id === item.reference_id);
    return p?.title ?? `#${item.reference_id ?? ''}`;
  }
  if (item.item_type === 'blog_post') {
    const p = posts.find((x) => x.id === item.reference_id);
    return p?.title ?? `#${item.reference_id ?? ''}`;
  }
  if (item.item_type === 'service') {
    const p = svcs.find((x) => x.id === item.reference_id);
    return p?.name ?? `#${item.reference_id ?? ''}`;
  }
  if (item.item_type === 'category') {
    const c = cats.find((x) => x.id === item.reference_id);
    return c?.name ?? `#${item.reference_id ?? ''}`;
  }
  if (item.item_type === 'skill') {
    const s = sks.find((x) => x.id === item.reference_id);
    return s?.name ?? `#${item.reference_id ?? ''}`;
  }
  return item.item_type;
}

/** Renders primary line for each menu row (labels depend on picker data). */
const RowLabel = component$<{ text: string }>((props) => {
  return <div class="font-medium text-gray-900 dark:text-gray-100">{props.text}</div>;
});

export const head: DocumentHead = {
  title: 'Menus - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage navigation menus',
    },
  ],
};
