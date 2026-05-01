import { useSignal, useStore, $ } from '@builder.io/qwik';
import { useTranslate, translateApp } from '../i18n/useTranslate';
import { useSwal } from './useSwal';
import { getApiClient } from '../api/client';

/**
 * CRUD hook interface
 */
export interface CrudState<T = any> {
  loading: { value: boolean };
  saving: { value: boolean };
  items: { value: T[] };
  selectedItems: { value: Set<string | number> };
  currentItem: { value: T | null };
  loadData: (filters?: Record<string, any>) => Promise<void>;
  create: (data: any) => Promise<any>;
  update: (id: string | number, data: any) => Promise<any>;
  remove: (id: string | number) => Promise<boolean>;
  bulkDelete: (ids: (string | number)[]) => Promise<boolean>;
  toggleSelect: (id: string | number) => void;
  selectAll: () => void;
  deselectAll: () => void;
}

/**
 * Hook for CRUD operations
 * Must be used inside a Qwik component
 * @param resourcePath - API path for the resource (e.g., '/v1/projects')
 * @param options - Configuration options
 * @returns CRUD state and methods
 */
export function useCrud<T = any>(
  resourcePath: string,
  options: { autoLoad?: boolean } = {}
): CrudState<T> {
  const { lang } = useTranslate();
  const { success, error: showError, confirm } = useSwal();
  const apiClient = getApiClient();

  const loading = useSignal(false);
  const saving = useSignal(false);
  const items = useSignal<T[]>([]);
  const selectedItems = useSignal<Set<string | number>>(new Set());
  const currentItem = useSignal<T | null>(null);

  const loadData = $(async (filters: Record<string, any> = {}) => {
    loading.value = true;
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const queryString = params.toString();
      const url = queryString ? `${resourcePath}?${queryString}` : resourcePath;
      const result = await apiClient.get<T[]>(url);
      items.value = (result?.data ?? result ?? []) as T[];
      selectedItems.value = new Set();
    } catch (err: any) {
      await showError(err?.message || 'Failed to load data');
    } finally {
      loading.value = false;
    }
  });

  const create = $(async (data: any) => {
    saving.value = true;
    try {
      const result = await apiClient.post<T>(resourcePath, data);
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'common.created') || 'Created successfully',
      });
      return result;
    } catch (err: any) {
      await showError(err?.message || 'Failed to create');
      throw err;
    } finally {
      saving.value = false;
    }
  });

  const update = $(async (id: string | number, data: any) => {
    saving.value = true;
    try {
      const result = await apiClient.put<T>(`${resourcePath}/${id}`, data);
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'common.updated') || 'Updated successfully',
      });
      return result;
    } catch (err: any) {
      await showError(err?.message || 'Failed to update');
      throw err;
    } finally {
      saving.value = false;
    }
  });

  const remove = $(async (id: string | number) => {
    const result = await confirm(translateApp(lang, 'common.deleteConfirm'), {
      icon: 'warning',
      title: translateApp(lang, 'common.delete'),
    });
    if (!result.isConfirmed) return false;

    try {
      await apiClient.delete(`${resourcePath}/${id}`);
      items.value = items.value.filter((item: any) => item.id !== id);
      const newSelected = new Set(selectedItems.value);
      newSelected.delete(id);
      selectedItems.value = newSelected;
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'common.deleted') || 'Deleted successfully',
      });
      return true;
    } catch (err: any) {
      await showError(err?.message || 'Failed to delete');
      return false;
    }
  });

  const bulkDelete = $(async (ids: (string | number)[]) => {
    if (!ids || ids.length === 0) return false;

    const result = await confirm(translateApp(lang, 'common.deleteConfirm'), {
      icon: 'warning',
      title: translateApp(lang, 'common.delete'),
    });
    if (!result.isConfirmed) return false;

    try {
      await apiClient.post(`${resourcePath}/bulk-delete`, { ids });
      items.value = items.value.filter(
        (item: any) => !ids.includes(item.id)
      );
      const newSelected = new Set(selectedItems.value);
      ids.forEach((id) => newSelected.delete(id));
      selectedItems.value = newSelected;
      await success(translateApp(lang, 'common.success'), {
        text: translateApp(lang, 'common.deleted') || 'Deleted successfully',
      });
      return true;
    } catch (err: any) {
      await showError(err?.message || 'Failed to delete');
      return false;
    }
  });

  const toggleSelect = $((id: string | number) => {
    const newSelected = new Set(selectedItems.value);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    selectedItems.value = newSelected;
  });

  const selectAll = $(() => {
    const newSelected = new Set<string | number>();
    items.value.forEach((item: any) => {
      if (item.id !== undefined) {
        newSelected.add(item.id);
      }
    });
    selectedItems.value = newSelected;
  });

  const deselectAll = $(() => {
    selectedItems.value = new Set();
  });

  return {
    loading,
    saving,
    items,
    selectedItems,
    currentItem,
    loadData,
    create,
    update,
    remove,
    bulkDelete,
    toggleSelect,
    selectAll,
    deselectAll,
  };
}
