import { component$, useSignal, $, useVisibleTask$, useTask$, type QRL } from '@builder.io/qwik';
import { useTranslate, translateApp } from '../../lib/i18n/useTranslate';
import { useSwal } from '../../lib/hooks/useSwal';
import { getApiClient } from '../../lib/api/client';
import { API_ENDPOINTS } from '../../lib/api/endpoints';
import { getProjectSettings } from '../../lib/api/project-settings';
import { formatFileSize } from '../../lib/utils/formatters';
import { LoadingSpinner } from '../common/LoadingSpinner';
import type { Media } from '../../types';

interface MediaLibraryProps {
  accept?: string; // e.g., 'image/*', 'video/*'
  onSelect: QRL<(media: Media) => void>;
  selectionMode?: boolean; // If true, shows selection UI
}

/**
 * Standalone Media Library Component
 * Can be embedded in modals without admin layout
 */
export const MediaLibrary = component$<MediaLibraryProps>((props) => {
  const { lang } = useTranslate();
  const { error: showError } = useSwal();
  const media = useSignal<Media[]>([]);
  const loading = useSignal(false);
  const uploadLoading = useSignal(false);
  const selectedItems = useSignal<Set<string | number>>(new Set());
  const searchQuery = useSignal('');
  const debouncedSearch = useSignal('');
  const currentPage = useSignal(1);
  const totalPages = useSignal(1);
  const total = useSignal(0);
  const fileInput = useSignal<HTMLInputElement | null>(null);
  const isDragging = useSignal(false);
  const maxFileSize = useSignal<number | null>(null);
  const maxFileSizeSource = useSignal<'server' | 'application' | null>(null);

  const fileTooLargeTemplate = translateApp(lang, 'media.fileTooLarge');

  const loadMedia = $(async (page = 1) => {
    loading.value = true;
    try {
      const apiClient = getApiClient();
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('per_page', '20');
      
      if (debouncedSearch.value) {
        params.append('search', debouncedSearch.value);
      }
      
      // Filter by accept type
      if (props.accept) {
        if (props.accept.includes('image')) {
          params.append('mime_type', 'image');
        } else if (props.accept.includes('video')) {
          params.append('mime_type', 'video');
        }
      }

      const endpoint = `${API_ENDPOINTS.MEDIA.LIST}?${params.toString()}`;
      const response = await apiClient.get<{ data: Media[]; current_page: number; last_page: number; per_page: number; total: number }>(
        endpoint
      );
      
      const data = response?.data ?? response;
      
      if (Array.isArray(data)) {
        media.value = data as Media[];
        currentPage.value = page;
        totalPages.value = 1;
        total.value = data.length;
      } else {
        media.value = (data?.data ?? []) as Media[];
        currentPage.value = (data as any)?.current_page ?? page;
        totalPages.value = (data as any)?.last_page ?? 1;
        total.value = (data as any)?.total ?? 0;
      }
    } catch (error: any) {
      console.error('Failed to load media:', error);
    } finally {
      loading.value = false;
    }
  });

  // Debounce search - use useTask$ since it doesn't need to wait for visibility
  useTask$(({ track, cleanup }) => {
    track(() => searchQuery.value);
    const timeout = setTimeout(() => {
      debouncedSearch.value = searchQuery.value;
      loadMedia(1);
    }, 300);
    cleanup(() => clearTimeout(timeout));
  });

  // Load max file size from server settings
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(async () => {
    try {
      const settings = await getProjectSettings();
      if (settings.max_file_size) {
        maxFileSize.value = settings.max_file_size;
        maxFileSizeSource.value = 'server';
      } else {
        maxFileSize.value = 104857600;
        maxFileSizeSource.value = 'application';
      }
    } catch (error: any) {
      console.error('Failed to load max file size:', error);
      maxFileSize.value = 104857600;
      maxFileSizeSource.value = 'application';
    }
  });

  // Load media on mount - only when component becomes visible (modal opens)
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    loadMedia(1);
  });

  const toggleSelect = $((id: string | number) => {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id);
    } else {
      // In selection mode, only allow one selection
      if (props.selectionMode) {
        selectedItems.value.clear();
      }
      selectedItems.value.add(id);
    }
    selectedItems.value = new Set(selectedItems.value);
  });

  const handleApply = $(() => {
    if (selectedItems.value.size === 0) return;
    const id = Array.from(selectedItems.value)[0];
    const selected = media.value.find((m) => m.id === id);
    if (selected) {
      props.onSelect(selected);
    }
  });

  const uploadFiles = $(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    uploadLoading.value = true;

    try {
      const settings = await getProjectSettings();
      const maxBytes = settings.max_file_size ?? 104857600;
      if (!maxFileSize.value) {
        maxFileSize.value = maxBytes;
      }
      if (!maxFileSizeSource.value) {
        maxFileSizeSource.value = settings.max_file_size ? 'server' : 'application';
      }

      const toUpload: File[] = [];
      for (const file of Array.from(files)) {
        if (props.accept) {
          if (props.accept.includes('image') && !file.type.startsWith('image/')) continue;
          if (props.accept.includes('video') && !file.type.startsWith('video/')) continue;
        }
        if (file.size > maxBytes) {
          const msg = fileTooLargeTemplate
            .replace('{{name}}', file.name)
            .replace('{{max}}', formatFileSize(maxBytes));
          await showError(msg);
          uploadLoading.value = false;
          return;
        }
        toUpload.push(file);
      }

      const apiClient = getApiClient();
      for (const file of toUpload) {
        const formData = new FormData();
        formData.append('file', file);
        await apiClient.post(API_ENDPOINTS.MEDIA.UPLOAD, formData);
      }

      await loadMedia(currentPage.value);
    } catch (error: any) {
      console.error('Failed to upload media:', error);
    } finally {
      uploadLoading.value = false;
    }
  });

  const handleFileSelect = $(async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    await uploadFiles(files);
    if (input) input.value = '';
  });

  const handleDragEnter = $((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = true;
  });

  const handleDragOver = $((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  });

  const handleDragLeave = $((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === e.currentTarget) {
      isDragging.value = false;
    }
  });

  const handleDrop = $(async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDragging.value = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await uploadFiles(files);
    }
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div
      class="flex flex-col"
      onDragEnter$={handleDragEnter}
      onDragOver$={handleDragOver}
      onDragLeave$={handleDragLeave}
      onDrop$={handleDrop}
    >
      {/* Drag and Drop Overlay */}
      {isDragging.value && (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-primary-500/20 backdrop-blur-sm">
          <div class="rounded-lg bg-white p-8 shadow-xl dark:bg-gray-800">
            <div class="text-center">
              <svg
                class="mx-auto h-16 w-16 text-primary-600 dark:text-primary-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {translateApp(lang, 'media.dropFiles') || 'Drop files here to upload'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header with Upload and Search */}
      <div class="mb-4 flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <input
            type="text"
            placeholder={translateApp(lang, 'media.search') || 'Search media...'}
            value={searchQuery.value}
            onInput$={(e) => {
              searchQuery.value = (e.target as HTMLInputElement).value;
            }}
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
          />
        </div>
        <div class="flex gap-2">
          <input
            ref={(el) => (fileInput.value = el)}
            type="file"
            multiple
            accept={props.accept || 'image/*,video/*'}
            onChange$={handleFileSelect}
            class="hidden"
          />
          <button
            onClick$={() => fileInput.value?.click()}
            disabled={uploadLoading.value}
            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadLoading.value ? (translateApp(lang, 'media.uploading') || 'Uploading...') : (translateApp(lang, 'media.uploadFile') || 'Upload')}
          </button>
        </div>
      </div>

      {/* Max File Size Note */}
      {maxFileSize.value && (
        <div class="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <span class="font-medium">
            {translateApp(lang, 'media.maxFileSizeNote').replace('{{max}}', formatFileSize(maxFileSize.value))}
            {maxFileSizeSource.value === 'server'
              ? ` (${translateApp(lang, 'media.maxFileSizeSourceServer') || 'Server limit'})`
              : maxFileSizeSource.value === 'application'
                ? ` (${translateApp(lang, 'media.maxFileSizeSourceApplication') || 'Application limit'})`
                : ''}
          </span>
        </div>
      )}

      {/* Selection Bar */}
      {props.selectionMode && selectedItems.value.size > 0 && (
        <div class="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-primary-900 dark:text-primary-100">
              {selectedItems.value.size} {selectedItems.value.size === 1 ? (translateApp(lang, 'media.item') || 'item') : (translateApp(lang, 'media.items') || 'items')} {translateApp(lang, 'common.selected') || 'selected'}
            </span>
            <div class="flex items-center gap-2">
              <button
                onClick$={() => {
                  selectedItems.value.clear();
                  selectedItems.value = new Set();
                }}
                class="rounded-lg px-3 py-1 text-sm text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800"
              >
                {translateApp(lang, 'media.deselectAll') || 'Deselect All'}
              </button>
              <button
                onClick$={handleApply}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'common.select') || 'Select'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Grid */}
      {loading.value ? (
        <div class="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : media.value.length === 0 ? (
        <div class="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            class="h-12 w-12 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>{translateApp(lang, 'media.noMedia') || 'No media found'}</p>
        </div>
      ) : (
        <>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-4">
            {media.value.map((item) => {
              const isSelected = selectedItems.value.has(item.id);
              const mimeType = item.mimeType || (item as any).mime_type || '';
              const isImage = mimeType.startsWith('image/');
              const isVideo = mimeType.startsWith('video/');

              return (
                <div
                  key={item.id}
                  class={`relative group cursor-pointer rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary-500 ring-2 ring-primary-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                  }`}
                  onClick$={() => {
                    toggleSelect(item.id);
                  }}
                >
                  {/* Selection Checkbox */}
                  {props.selectionMode && (
                    <div class="absolute top-2 right-2 z-10">
                      <div
                        class={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary-600 border-primary-600'
                            : 'bg-white/90 border-gray-300 dark:bg-gray-800/90 dark:border-gray-600'
                        }`}
                      >
                        {isSelected && (
                          <svg
                            class="w-4 h-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Media Preview */}
                  <div class="aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
                    {isImage ? (
                      <img
                        src={item.url || item.thumbnailUrl || ''}
                        alt={item.altText || item.name}
                        width="200"
                        height="200"
                        class="w-full h-full object-cover"
                      />
                    ) : isVideo ? (
                      <div class="w-full h-full flex items-center justify-center">
                        <svg
                          class="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M14.752 11.168l-6.586-3.793A1 1 0 007 8.191v7.618a1 1 0 001.166.986l6.586-3.793a1 1 0 000-1.834z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div class="w-full h-full flex items-center justify-center">
                        <svg
                          class="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Media Info */}
                  <div class="p-2 bg-white dark:bg-gray-900 rounded-b-lg">
                    <p class="text-xs font-medium text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                      {item.name}
                    </p>
                    {(item.size || (item as any).size) && (
                      <p class="text-xs text-gray-500 dark:text-gray-400">
                        {formatSize(item.size || (item as any).size || 0)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages.value > 1 && (
            <div class="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick$={() => loadMedia(currentPage.value - 1)}
                disabled={currentPage.value === 1}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.previous') || 'Previous'}
              </button>
              <span class="text-sm text-gray-600 dark:text-gray-400">
                {translateApp(lang, 'common.page') || 'Page'} {currentPage.value} {translateApp(lang, 'common.of') || 'of'} {totalPages.value}
              </span>
              <button
                onClick$={() => loadMedia(currentPage.value + 1)}
                disabled={currentPage.value >= totalPages.value}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.next') || 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
});
