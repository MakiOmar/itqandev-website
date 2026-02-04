/* eslint-disable qwik/valid-lexical-scope */
import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => any;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    currentPage: number;
    perPage: number;
    total: number;
    onPageChange: QRL<(page: number) => void>;
    onPerPageChange: QRL<(perPage: number) => void>;
  };
  search?: {
    value: string;
    onSearch: QRL<(value: string) => void>;
    placeholder?: string;
  };
  selection?: {
    selected: string[];
    onSelect: QRL<(ids: string[]) => void>;
    getId: (item: T) => string;
  };
  emptyMessage?: string;
  class?: string;
}

/**
 * Reusable data table component with pagination, search, and sorting
 */
export const DataTable = component$<DataTableProps<any>>((props) => {
  const sortColumn = useSignal<string | null>(null);
  const sortDirection = useSignal<'asc' | 'desc'>('asc');
  
  // Pre-serialize all column data to avoid Symbol serialization issues
  const columnKeys = props.columns.map((c) => String(c.key));
  const columnLabels = props.columns.map((c) => c.label);
  const columnSortable = props.columns.map((c) => !!c.sortable);
  const hasSelection = !!props.selection;
  const hasSearch = !!props.search;
  const hasPagination = !!props.pagination;
  
  // Extract callbacks before QRLs to avoid serialization issues
  const searchOnSearch = props.search?.onSearch;
  const selectionOnSelect = props.selection?.onSelect;
  const paginationOnPageChange = props.pagination?.onPageChange;
  const paginationOnPerPageChange = props.pagination?.onPerPageChange;

  const handleSort = $((columnKey: string) => {
    if (sortColumn.value === columnKey) {
      sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn.value = columnKey;
      sortDirection.value = 'asc';
    }
  });

  const handleSelectAll = $((checked: boolean, dataItems: any[], selectedIds: string[], onSelect: QRL<(ids: string[]) => void> | undefined, getId: ((item: any) => string) | undefined) => {
    if (!onSelect || !getId) return;
    if (checked) {
      const ids: string[] = [];
      for (const item of dataItems) {
        ids.push(getId(item));
      }
      onSelect(ids);
    } else {
      onSelect([]);
    }
  });

  const handleSelectItem = $((id: string, checked: boolean, selectedIds: string[], onSelect: QRL<(ids: string[]) => void> | undefined) => {
    if (!onSelect) return;
    const newSelected = [...selectedIds];
    if (checked) {
      newSelected.push(id);
    } else {
      const index = newSelected.indexOf(id);
      if (index > -1) newSelected.splice(index, 1);
    }
    onSelect(newSelected);
  });
  
  const handleSearchInput = $((value: string) => {
    if (searchOnSearch) {
      searchOnSearch(value);
    }
  });
  
  const handlePerPageChange = $((value: number) => {
    if (paginationOnPerPageChange) {
      paginationOnPerPageChange(value);
    }
  });
  
  const handlePageChange = $((page: number) => {
    if (paginationOnPageChange) {
      paginationOnPageChange(page);
    }
  });

  if (props.loading) {
    return (
      <div class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (props.data.length === 0) {
    return (
      <EmptyState
        title={props.emptyMessage || 'No data available'}
        description="There are no items to display at this time."
      />
    );
  }

  const totalPages = props.pagination
    ? Math.ceil(props.pagination.total / props.pagination.perPage)
    : 1;

  return (
    <>
      {/* Component: DataTable */}
      <div class={`space-y-4 ${props.class || ''}`}>
      {/* Search */}
      {hasSearch && props.search && (
        <div class="flex items-center gap-4">
          <input
            type="text"
            value={props.search.value}
            onInput$={(e: any) => handleSearchInput(e.target.value)}
            placeholder={props.search.placeholder || 'Search...'}
            class="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Table */}
      <div class="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              {hasSelection && props.selection && (
                <th class="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      props.selection.selected.length === props.data.length &&
                      props.data.length > 0
                    }
                    onChange$={(e: any) => {
                      if (!props.selection) return;
                      const checked = e.target.checked;
                      const data = props.data;
                      const selected = props.selection.selected;
                      const getId = props.selection.getId;
                      handleSelectAll(checked, data, selected, selectionOnSelect, getId);
                    }}
                    class="rounded border-gray-300 dark:border-gray-600"
                  />
                </th>
              )}
              {props.columns.map((column, idx) => {
                const columnKey = columnKeys[idx];
                const isSortable = columnSortable[idx];
                return (
                  <th
                    key={columnKey}
                    class={`px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-white ${
                      isSortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
                    }`}
                    onClick$={() => {
                      if (isSortable) {
                        handleSort(columnKey);
                      }
                    }}
                  >
                    <div class="flex items-center gap-2">
                      {columnLabels[idx]}
                      {isSortable && sortColumn.value === columnKey && (
                        <span>{sortDirection.value === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody class="divide-y">
            {props.data.map((item, index) => (
              <tr
                key={index}
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                {hasSelection && props.selection && (
                  <td class="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={props.selection.selected.includes(
                        props.selection.getId(item) as string,
                      )}
                      onChange$={(e: any) => {
                        if (!props.selection) return;
                        const id = props.selection.getId(item) as string;
                        const checked = e.target.checked;
                        const selected = props.selection.selected;
                        handleSelectItem(id, checked, selected, selectionOnSelect);
                      }}
                      class="rounded border-gray-300 dark:border-gray-600"
                    />
                  </td>
                )}
                {props.columns.map((column, colIdx) => {
                  const rawValue = item[column.key as keyof typeof item];
                  const value = column.render
                    ? column.render(item)
                    : (rawValue as string);
                  return (
                    <td
                      key={columnKeys[colIdx]}
                      class="px-4 py-3 text-sm text-gray-900 dark:text-white"
                    >
                      {String(value)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {hasPagination && props.pagination && (
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Rows per page:</span>
            <select
              value={props.pagination.perPage}
              onChange$={(e: any) => handlePerPageChange(Number(e.target.value))}
              class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-white"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              Page {props.pagination.currentPage} of {totalPages} (
              {props.pagination.total} total)
            </span>
            <button
              onClick$={() => {
                if (!props.pagination) return;
                const currentPage = props.pagination.currentPage;
                const page = currentPage - 1;
                handlePageChange(page);
              }}
              disabled={props.pagination.currentPage === 1}
              class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick$={() => {
                if (!props.pagination) return;
                const currentPage = props.pagination.currentPage;
                const page = currentPage + 1;
                handlePageChange(page);
              }}
              disabled={props.pagination.currentPage >= totalPages}
              class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1 text-sm text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
});
