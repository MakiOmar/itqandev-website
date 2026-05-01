import { component$, useSignal, $, useVisibleTask$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, useNavigate, useLocation, zod$, z } from '@builder.io/qwik-city';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import { getProjectSettings } from '../../../lib/api/project-settings';
import { formatFileSize } from '../../../lib/utils/formatters';
import type { Media } from '../../../types';

/**
 * Folder interface
 */
interface Folder {
  id: number;
  name: string;
  description?: string;
}

/**
 * Load folders
 */
export const useFolders = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<Folder[]>(API_ENDPOINTS.MEDIA.FOLDERS.LIST);
    
    // Handle paginated response
    if (response && 'data' in response && response.data) {
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data as Folder[];
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data as Folder[];
      }
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to load folders:', error);
    return [];
  }
});

/**
 * Load media with filters - Matching Vue Dashboard
 */
export const useMedia = routeLoader$(async ({ url, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const params = new URLSearchParams();
    
    // Get filter params from URL
    const page = url.searchParams.get('page') || '1';
    const perPage = url.searchParams.get('per_page') || '20';
    const search = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    const mimeType = url.searchParams.get('mime_type') || '';
    const folderId = url.searchParams.get('folder_id') || '';
    const accept = url.searchParams.get('accept') || ''; // For selection mode

    params.append('page', page);
    params.append('per_page', perPage);
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);
    
    // Map accept prop to mime_type filter
    if (accept) {
      if (accept.includes('image')) {
        params.append('mime_type', 'image');
      } else if (accept.includes('video')) {
        params.append('mime_type', 'video');
      }
    } else if (mimeType) {
      params.append('mime_type', mimeType);
    }
    
    if (folderId) params.append('folder_id', folderId);

    const response = await apiClient.get<{ data: Media[]; current_page: number; last_page: number; per_page: number; total: number }>(
      `${API_ENDPOINTS.MEDIA.LIST}?${params.toString()}`
    );

    const data = response?.data ?? response;
    if (Array.isArray(data)) {
      return {
        media: data as Media[],
        pagination: {
          currentPage: 1,
          perPage: 20,
          total: data.length,
          totalPages: 1,
        },
      };
    }

    return {
      media: (data?.data ?? []) as Media[],
      pagination: {
        currentPage: data?.current_page ?? 1,
        perPage: data?.per_page ?? 20,
        total: data?.total ?? 0,
        totalPages: data?.last_page ?? 1,
      },
    };
  } catch (error: any) {
    console.error('Failed to load media:', error);
    return {
      media: [],
      pagination: {
        currentPage: 1,
        perPage: 20,
        total: 0,
        totalPages: 1,
      },
    };
  }
});

/**
 * Upload media action
 */
export const useUploadMedia = routeAction$(async (data, { fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const formData = new FormData();
    if (data.file instanceof File) {
      formData.append('file', data.file);
    }
    if (data.folder_id) {
      formData.append('folder_id', String(data.folder_id));
    }
    await apiClient.post(API_ENDPOINTS.MEDIA.UPLOAD, formData);
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to upload media' });
  }
}, zod$({ file: z.any(), folder_id: z.union([z.string(), z.number()]).optional() }));

/**
 * Update media action
 */
export const useUpdateMedia = routeAction$(async (data, { fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    await apiClient.put(API_ENDPOINTS.MEDIA.UPDATE(data.id as string), {
      name: data.name,
      alt_text: data.alt_text || '',
      description: data.description || '',
      folder_id: data.folder_id || null,
      tags: Array.isArray(data.tags) ? data.tags : [],
    });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to update media' });
  }
}, zod$({
  id: z.string(),
  name: z.string(),
  alt_text: z.string().optional(),
  description: z.string().optional(),
  folder_id: z.union([z.string(), z.number(), z.null()]).optional(),
  tags: z.array(z.string()).optional(),
}));

/**
 * Create folder action
 */
export const useCreateFolder = routeAction$(async (data, { fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    await apiClient.post(API_ENDPOINTS.MEDIA.FOLDERS.CREATE, {
      name: data.name,
      description: data.description || null,
    });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to create folder' });
  }
}, zod$({
  name: z.string().min(1, 'Folder name is required'),
  description: z.string().optional(),
}));

/**
 * Delete media action
 */
export const useDeleteMedia = routeAction$(async (data, { fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    await apiClient.delete(API_ENDPOINTS.MEDIA.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete media' });
  }
}, zod$({ id: z.string() }));

/**
 * Bulk delete media action
 */
export const useBulkDeleteMedia = routeAction$(async (data, { fail, cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    await apiClient.post(API_ENDPOINTS.MEDIA.BULK_DELETE, { ids: data.ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete media' });
  }
}, zod$({ ids: z.array(z.string()) }));

/**
 * Media page - Matching Vue Dashboard
 */
export default component$(() => {
  const { lang } = useTranslate();
  const { confirm, success, error: showError } = useSwal();
  const navigate = useNavigate();
  const location = useLocation();
  const mediaData = useMedia();
  const foldersData = useFolders();
  const updateAction = useUpdateMedia();
  const createFolderAction = useCreateFolder();
  const deleteAction = useDeleteMedia();
  const bulkDeleteAction = useBulkDeleteMedia();

  // Check if in selection mode
  const isSelectionMode = location.url.searchParams.get('select') === 'true';
  const acceptType = location.url.searchParams.get('accept') || '';
  const callbackType = location.url.searchParams.get('callback') || ''; // For identifying selection type (hero, video, featured_image)

  const media = useSignal(mediaData.value.media);
  const folders = useSignal(foldersData.value);
  const pagination = useSignal(mediaData.value.pagination);
  const loading = useSignal(false);
  const uploadLoading = useSignal(false);
  const selectedItems = useSignal<Set<string | number>>(new Set());
  const showEditModal = useSignal(false);
  const showFolderModal = useSignal(false);
  const editingMedia = useSignal<any>(null);
  const newTagName = useSignal('');
  const isDragging = useSignal(false);
  const fileInput = useSignal<HTMLInputElement | null>(null);
  const uploadFolderId = useSignal<number | null>(null);
  const maxFileSize = useSignal<number | null>(null);
  const maxFileSizeSource = useSignal<'server' | 'application' | null>(null);
  
  const searchQuery = useSignal(location.url.searchParams.get('search') || '');
  const debouncedSearch = useSignal(searchQuery.value);
  const sortBy = useSignal(location.url.searchParams.get('sort_by') || 'created_at');
  const sortOrder = useSignal<'asc' | 'desc'>((location.url.searchParams.get('sort_order') || 'desc') as 'asc' | 'desc');
  
  const filters = useSignal({
    file_type: location.url.searchParams.get('mime_type') || '',
    folder_id: location.url.searchParams.get('folder_id') || '',
  });

  const folderForm = useSignal({
    name: '',
    description: '',
  });

  const loadMedia = $(async (page = 1) => {
    loading.value = true;
    try {
      const apiClient = getApiClient();
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('per_page', '20');
      if (debouncedSearch.value) params.append('search', debouncedSearch.value);
      if (sortBy.value) params.append('sort_by', sortBy.value);
      if (sortOrder.value) params.append('sort_order', sortOrder.value);
      
      if (acceptType) {
        if (acceptType.includes('image')) {
          params.append('mime_type', 'image');
        } else if (acceptType.includes('video')) {
          params.append('mime_type', 'video');
        }
      } else if (filters.value.file_type) {
        params.append('mime_type', filters.value.file_type);
      }
      
      if (filters.value.folder_id) params.append('folder_id', filters.value.folder_id);

      const endpoint = `${API_ENDPOINTS.MEDIA.LIST}?${params.toString()}`;
      const response = await apiClient.get<{ data: Media[]; current_page: number; last_page: number; per_page: number; total: number }>(
        endpoint
      );
      const data = response?.data ?? response;
      
      if (Array.isArray(data)) {
        media.value = data as Media[];
        pagination.value = {
          currentPage: page,
          perPage: 20,
          total: data.length,
          totalPages: 1,
        };
      } else {
        media.value = (data?.data ?? []) as Media[];
        pagination.value = {
          currentPage: (data as any)?.current_page ?? page,
          perPage: (data as any)?.per_page ?? 20,
          total: (data as any)?.total ?? 0,
          totalPages: (data as any)?.last_page ?? 1,
        };
      }
      
      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('page', String(page));
      if (debouncedSearch.value) url.searchParams.set('search', debouncedSearch.value);
      else url.searchParams.delete('search');
      if (sortBy.value) url.searchParams.set('sort_by', sortBy.value);
      if (sortOrder.value) url.searchParams.set('sort_order', sortOrder.value);
      if (filters.value.file_type) url.searchParams.set('mime_type', filters.value.file_type);
      else url.searchParams.delete('mime_type');
      if (filters.value.folder_id) url.searchParams.set('folder_id', filters.value.folder_id);
      else url.searchParams.delete('folder_id');
      
      navigate(url.pathname + url.search, { replaceState: true });
    } catch (error: any) {
      await showError(error?.message || 'Failed to load media');
    } finally {
      loading.value = false;
    }
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

  // Debounce search - must be after loadMedia is defined
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => searchQuery.value);
    const timeout = setTimeout(() => {
      debouncedSearch.value = searchQuery.value;
      loadMedia(1);
    }, 300);
    return () => clearTimeout(timeout);
  });

  const loadFolders = $(async () => {
    try {
      const apiClient = getApiClient();
      const response = await apiClient.get<Folder[]>(API_ENDPOINTS.MEDIA.FOLDERS.LIST);
      folders.value = (response?.data ?? response ?? []) as Folder[];
    } catch (error: any) {
      console.error('Failed to load folders:', error);
    }
  });

  // Pre-compute translation strings to avoid serialization issues
  // Get base translation strings as plain strings
  const deleteMultipleConfirmBase = String(translateApp(lang, 'media.deleteMultipleConfirm', { count: 0 }));
  
  const translations = {
    uploadFailed: translateApp(lang, 'media.uploadFailed'),
    fileTooLargeTemplate: translateApp(lang, 'media.fileTooLarge'),
    deleteConfirm: translateApp(lang, 'media.deleteConfirm'),
    deleteTitle: translateApp(lang, 'common.delete'),
    successTitle: translateApp(lang, 'common.success'),
    deleteSuccess: translateApp(lang, 'media.deleteSuccess'),
    // Store the delete multiple confirm template as a plain string
    deleteMultipleConfirmTemplate: deleteMultipleConfirmBase,
  };

  const uploadFiles = $(async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    uploadLoading.value = true;

    try {
      const settings = await getProjectSettings();
      const maxBytes = settings.max_file_size ?? 104857600; // 100MB default

      for (const file of Array.from(files)) {
        if (file.size > maxBytes) {
          const msg = translations.fileTooLargeTemplate
            .replace('{{name}}', file.name)
            .replace('{{max}}', formatFileSize(maxBytes));
          await showError(msg);
          uploadLoading.value = false;
          return;
        }
      }

      const apiClient = getApiClient();

      for (const file of Array.from(files)) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          if (uploadFolderId.value) {
            formData.append('folder_id', String(uploadFolderId.value));
          }

          if (!formData.has('file')) {
            throw new Error('FormData does not contain file field');
          }

          await apiClient.post(API_ENDPOINTS.MEDIA.UPLOAD, formData);
        } catch (error: any) {
          // Extract error message from Laravel validation response
          let errorMessage = translations.uploadFailed;
          if (error?.message) {
            errorMessage = error.message;
          } else if (error?.data?.message) {
            errorMessage = error.data.message;
          } else if (error?.data?.errors?.file) {
            // Laravel validation error format
            const fileErrors = error.data.errors.file;
            errorMessage = Array.isArray(fileErrors) ? fileErrors[0] : fileErrors;
          }
          await showError(`${file.name}: ${errorMessage}`);
        }
      }
      
      // Reload media after all uploads complete
      await loadMedia(parseInt(location.url.searchParams.get('page') || '1'));
    } catch (error: any) {
      await showError(error?.message || translations.uploadFailed);
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

  const deleteMedia = $(async (id: string | number) => {
    const result = await confirm(translations.deleteConfirm, {
      icon: 'warning',
      title: translations.deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ id: String(id) });
    if (response.value?.failed) {
      await showError((response.value as any).message || translations.uploadFailed);
    } else {
      await success(translations.successTitle, { text: translations.deleteSuccess });
      await loadMedia(parseInt(location.url.searchParams.get('page') || '1'));
    }
  });

  const bulkDelete = $(async () => {
    if (selectedItems.value.size === 0) return;
    const count = selectedItems.value.size;
    
    // Format the translation template with the actual count
    // The translation system should handle {count} placeholder, but if not, we format it manually
    let deleteConfirmText = translations.deleteMultipleConfirmTemplate;
    // Try to replace common placeholder patterns
    deleteConfirmText = deleteConfirmText.replace(/\{count\}/g, String(count));
    deleteConfirmText = deleteConfirmText.replace(/\{\{count\}\}/g, String(count));
    // If the translation function already formatted it with 0, try to replace 0 with actual count
    if (deleteConfirmText.includes('0') && count !== 0) {
      deleteConfirmText = deleteConfirmText.replace(/\b0\b/, String(count));
    }
    
    const result = await confirm(deleteConfirmText, {
      icon: 'warning',
      title: translations.deleteTitle,
    });
    if (!result.isConfirmed) return;

    const response = await bulkDeleteAction.submit({ ids: Array.from(selectedItems.value).map(String) });
    if (response.value?.failed) {
      await showError((response.value as any).message || translations.uploadFailed);
    } else {
      await success(translations.successTitle, { text: translations.deleteSuccess });
      selectedItems.value.clear();
      await loadMedia(parseInt(location.url.searchParams.get('page') || '1'));
    }
  });

  const bulkDownload = $(async () => {
    if (selectedItems.value.size === 0) return;
    const ids = Array.from(selectedItems.value).map(String);
    const apiClient = getApiClient();
    try {
      const url = `${(apiClient as any).baseUrl}/v1/media/bulk-download?ids=${ids.join(',')}`;
      window.open(url, '_blank');
    } catch (error: any) {
      await showError(error?.message || 'Failed to download files');
    }
  });

  const toggleSelect = $((id: string | number) => {
    if (selectedItems.value.has(id)) {
      selectedItems.value.delete(id);
    } else {
      selectedItems.value.add(id);
    }
    selectedItems.value = new Set(selectedItems.value);
  });

  const deselectAll = $(() => {
    selectedItems.value.clear();
    selectedItems.value = new Set();
  });

  const formatSize = $((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  });

  // Pre-compute model type labels to avoid serialization issues
  const modelTypeLabels: Record<string, string> = {
    'App\\Models\\Project': translateApp(lang, 'media.modelType.project'),
    'App\\Models\\Category': translateApp(lang, 'media.modelType.category'),
    'App\\Models\\Skill': translateApp(lang, 'media.modelType.skill'),
    'App\\Models\\BlogPost': translateApp(lang, 'media.modelType.blogPost'),
    'App\\Models\\MediaLibrary': translateApp(lang, 'media.modelType.library') || 'Media Library',
  };

  const getModelTypeLabel = ((type: string) => {
    return modelTypeLabels[type] || type;
  });

  const editMedia = $(async (item: Media) => {
    try {
      const apiClient = getApiClient();
      const fullMedia = await apiClient.get(API_ENDPOINTS.MEDIA.GET(item.id));
      editingMedia.value = {
        ...(fullMedia?.data ?? fullMedia ?? item),
        tagNames: ((fullMedia?.data ?? fullMedia ?? item) as any)?.tags?.map((t: any) => t.name) || [],
      };
      showEditModal.value = true;
    } catch {
      editingMedia.value = {
        ...item,
        tagNames: (item as any)?.tags?.map((t: any) => t.name) || [],
      };
      showEditModal.value = true;
    }
  });

  const addTag = $(() => {
    if (newTagName.value.trim() && !editingMedia.value?.tagNames?.includes(newTagName.value.trim())) {
      editingMedia.value.tagNames.push(newTagName.value.trim());
      newTagName.value = '';
    }
  });

  const removeTag = $((tagName: string) => {
    editingMedia.value.tagNames = editingMedia.value.tagNames.filter((t: string) => t !== tagName);
  });

  // Pre-compute save media translations
  const saveMediaTranslations = {
    successTitle: translateApp(lang, 'common.success'),
    updateSuccess: translateApp(lang, 'media.updateSuccess'),
  };

  const saveMedia = $(async () => {
    if (!editingMedia.value) return;
    
    try {
      const altText = editingMedia.value.altText || (editingMedia.value as any).alt_text || '';
      const response = await updateAction.submit({
        id: String(editingMedia.value.id),
        name: editingMedia.value.name,
        alt_text: altText,
        description: (editingMedia.value as any).description || '',
        folder_id: (editingMedia.value as any).folder_id || null,
        tags: editingMedia.value.tagNames || [],
      });
      if (response.value?.failed) {
        await showError((response.value as any).message || 'Failed to update media');
      } else {
        showEditModal.value = false;
        editingMedia.value = null;
        await loadMedia(parseInt(location.url.searchParams.get('page') || '1'));
        await success(saveMediaTranslations.successTitle, { text: saveMediaTranslations.updateSuccess });
      }
    } catch (error: any) {
      await showError(error?.message || 'Failed to save media');
    }
  });

  // Pre-compute create folder translations
  const createFolderTranslations = {
    folderNameRequired: translateApp(lang, 'media.folderNameRequired') || 'Folder name is required',
    folderCreateFailed: translateApp(lang, 'media.folderCreateFailed'),
    successTitle: translateApp(lang, 'common.success'),
    folderCreated: translateApp(lang, 'media.folderCreated'),
  };

  const createFolder = $(async () => {
    if (!folderForm.value.name.trim()) {
      await showError(createFolderTranslations.folderNameRequired);
      return;
    }
    try {
      const response = await createFolderAction.submit({
        name: folderForm.value.name.trim(),
        description: folderForm.value.description || '',
      });
      if (response.value?.failed) {
        await showError((response.value as any).message || createFolderTranslations.folderCreateFailed);
      } else {
        showFolderModal.value = false;
        folderForm.value = { name: '', description: '' };
        await loadFolders();
        await success(createFolderTranslations.successTitle, { text: createFolderTranslations.folderCreated });
      }
    } catch (error: any) {
      await showError(error?.message || createFolderTranslations.folderCreateFailed);
    }
  });

  const selectMedia = $(() => {
    if (selectedItems.value.size === 0) return;
    const id = Array.from(selectedItems.value)[0];
    const selected = media.value.find((m) => m.id === id);
    if (!selected || typeof window === 'undefined') return;

    const message = {
      type: 'media-selected',
      media: selected,
      callback: callbackType, // Pass callback type to identify selection (hero, video, featured_image)
    };

    // Check if we're in an iframe (parent window exists)
    if (window.parent && window.parent !== window) {
      // Send message to parent window (iframe case)
      window.parent.postMessage(message, '*');
    } else if ((window as any).opener) {
      // Send message to opener window (popup case)
      (window as any).opener.postMessage(message, '*');
      window.close();
    }
  });

  const handleSort = $(() => {
    loadMedia(1);
  });

  return (
    <>
      {/* Component: MediaPage */}
      <div
        onDragEnter$={handleDragEnter}
        onDragOver$={handleDragOver}
        onDragLeave$={handleDragLeave}
        onDrop$={handleDrop}
        class={`relative min-h-screen ${isDragging.value ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
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
                  {translateApp(lang, 'media.dropFiles')}
                </p>
                <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {translateApp(lang, 'media.supportedFormats')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div class="mb-6 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {isSelectionMode ? (translateApp(lang, 'media.selectMedia') || 'Select Media') : translateApp(lang, 'media.title')}
            </h1>
            <p class="text-gray-600 dark:text-gray-400">{translateApp(lang, 'media.subtitle')}</p>
          </div>
          <div class="flex items-center gap-4">
            {!isSelectionMode && (
              <span class="text-sm text-gray-500 dark:text-gray-400">
                {pagination.value.total} {translateApp(lang, 'media.file')}
              </span>
            )}
            {isSelectionMode && selectedItems.value.size > 0 && (
              <button
                onClick$={selectMedia}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {translateApp(lang, 'common.select') || 'Select'}
              </button>
            )}
            <input
              ref={(el) => (fileInput.value = el)}
              type="file"
              multiple
              accept="image/*,video/*,application/pdf"
              onChange$={handleFileSelect}
              class="hidden"
            />
            <button
              onClick$={() => fileInput.value?.click()}
              disabled={uploadLoading.value}
              class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
            >
              {uploadLoading.value ? translateApp(lang, 'media.uploading') : translateApp(lang, 'media.uploadFile')}
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

        {/* Search and Sort Bar */}
        <div class="mb-4 flex flex-wrap items-center gap-4">
          <div class="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery.value}
              onInput$={(e: any) => (searchQuery.value = e.target.value)}
              placeholder={translateApp(lang, 'media.searchMedia')}
              class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            />
          </div>
          <div class="flex items-center gap-2">
            <select
              value={sortBy.value}
              onChange$={(e: any) => {
                sortBy.value = e.target.value;
                handleSort();
              }}
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
            >
              <option value="created_at">{translateApp(lang, 'media.sortNewest')}</option>
              <option value="name">{translateApp(lang, 'media.sortName')}</option>
              <option value="size">{translateApp(lang, 'media.sortSize')}</option>
            </select>
            <button
              onClick$={() => {
                sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
                handleSort();
              }}
              class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {sortOrder.value === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedItems.value.size > 0 && (
          <div class="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-3 dark:border-primary-800 dark:bg-primary-900/20">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-primary-900 dark:text-primary-100">
                {translateApp(lang, 'media.selectedItems', { count: selectedItems.value.size })}
              </span>
              <div class="flex items-center gap-2">
                {!isSelectionMode && (
                  <button
                    onClick$={bulkDownload}
                    class="rounded-lg px-3 py-1 text-sm text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800"
                  >
                    {translateApp(lang, 'media.downloadSelected')}
                  </button>
                )}
                <button
                  onClick$={deselectAll}
                  class="rounded-lg px-3 py-1 text-sm text-primary-700 hover:bg-primary-100 dark:text-primary-300 dark:hover:bg-primary-800"
                >
                  {translateApp(lang, 'media.deselectAll')}
                </button>
                {!isSelectionMode && (
                  <button
                    onClick$={bulkDelete}
                    class="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
                  >
                    {translateApp(lang, 'media.deleteSelected')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="grid gap-4 md:grid-cols-4">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'media.fileType')}
              </label>
              <select
                value={filters.value.file_type}
                onChange$={(e: any) => {
                  filters.value.file_type = e.target.value;
                  loadMedia(1);
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              >
                <option value="">{translateApp(lang, 'media.all')}</option>
                <option value="image">{translateApp(lang, 'media.images')}</option>
                <option value="video">{translateApp(lang, 'media.video')}</option>
                <option value="audio">{translateApp(lang, 'media.audio')}</option>
                <option value="document">{translateApp(lang, 'media.documents')}</option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'media.folders')}
              </label>
              <div class="flex gap-2">
                <select
                  value={filters.value.folder_id}
                  onChange$={(e: any) => {
                    filters.value.folder_id = e.target.value;
                    loadMedia(1);
                  }}
                  class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  <option value="">{translateApp(lang, 'media.all')}</option>
                  {folders.value.map((folder) => (
                    <option key={folder.id} value={String(folder.id)}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick$={() => (showFolderModal.value = true)}
                  class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-700"
                  title={translateApp(lang, 'media.createFolder')}
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                {translateApp(lang, 'media.uploadToFolder')}
              </label>
              <select
                value={uploadFolderId.value || ''}
                onChange$={(e: any) => {
                  uploadFolderId.value = e.target.value ? Number(e.target.value) : null;
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
              >
                <option value="">{translateApp(lang, 'media.rootFolder')}</option>
                {folders.value.map((folder) => (
                  <option key={folder.id} value={String(folder.id)}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            <div class="flex items-end">
              <button
                onClick$={() => {
                  filters.value = { file_type: '', folder_id: '' };
                  searchQuery.value = '';
                  debouncedSearch.value = '';
                  uploadFolderId.value = null;
                  loadMedia(1);
                }}
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {translateApp(lang, 'common.reset')}
              </button>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        {loading.value ? (
          <div class="py-12 text-center text-gray-500 dark:text-gray-400">
            <LoadingSpinner />
          </div>
        ) : media.value.length === 0 ? (
          <div class="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>{translateApp(lang, 'media.noFiles')}</p>
            <p class="mt-2 text-sm">{translateApp(lang, 'media.uploadFirstFile')}</p>
          </div>
        ) : (
          <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {media.value.map((item) => (
              <div
                key={item.id}
                class={`group relative overflow-hidden rounded-lg border shadow-sm transition-shadow hover:shadow-md ${
                  selectedItems.value.has(item.id)
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800'
                } ${isSelectionMode ? 'cursor-pointer' : ''}`}
                onClick$={isSelectionMode ? $(() => {
                  // In selection mode, clicking selects the item
                  if (selectedItems.value.has(item.id)) {
                    selectedItems.value.delete(item.id);
                  } else {
                    // Single selection mode - clear previous selection
                    selectedItems.value.clear();
                    selectedItems.value.add(item.id);
                  }
                  selectedItems.value = new Set(selectedItems.value);
                }) : undefined}
                onDblClick$={isSelectionMode ? $(() => {
                  // Double-click in selection mode immediately selects and sends
                  selectedItems.value.clear();
                  selectedItems.value.add(item.id);
                  selectedItems.value = new Set(selectedItems.value);
                  selectMedia();
                }) : undefined}
              >
                <div class="relative">
                  <input
                    type="checkbox"
                    checked={selectedItems.value.has(item.id)}
                    onChange$={() => toggleSelect(item.id)}
                    class="absolute left-2 top-2 z-10 h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div class="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {(item.mimeType || (item as any).mime_type)?.startsWith('image') ? (
                      <img
                        src={item.url}
                        alt={item.altText || (item as any).alt_text || item.name}
                        width="400"
                        height="400"
                        class="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div class="flex h-full items-center justify-center">
                        <span class="text-4xl">📄</span>
                      </div>
                    )}
                    {/* Action Buttons - Show on Hover */}
                    {!isSelectionMode && (
                      <div class="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick$={() => editMedia(item)}
                          class="rounded-lg bg-white/90 p-2 text-primary-600 shadow-lg transition hover:bg-white hover:text-primary-700 dark:bg-gray-800/90 dark:text-primary-400 dark:hover:bg-gray-800"
                          title={translateApp(lang, 'common.edit')}
                        >
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick$={() => {
                            window.open(item.url, '_blank');
                          }}
                          class="rounded-lg bg-white/90 p-2 text-primary-600 shadow-lg transition hover:bg-white hover:text-primary-700 dark:bg-gray-800/90 dark:text-primary-400 dark:hover:bg-gray-800"
                          title={translateApp(lang, 'media.download')}
                        >
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                            />
                          </svg>
                        </button>
                        <button
                          onClick$={() => deleteMedia(item.id)}
                          class="rounded-lg bg-white/90 p-2 text-red-600 shadow-lg transition hover:bg-white hover:text-red-700 dark:bg-gray-800/90 dark:text-red-400 dark:hover:bg-gray-800"
                          title={translateApp(lang, 'common.delete')}
                        >
                          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div class="p-3">
                  <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatSize(item.size || 0)}
                  </p>
                  {(item as any).model_type && (
                    <div class="mt-2">
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        {getModelTypeLabel((item as any).model_type || '')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.value.totalPages > 1 && (
          <div class="mt-6 flex items-center justify-center gap-2">
            <button
              onClick$={() => loadMedia(pagination.value.currentPage - 1)}
              disabled={pagination.value.currentPage === 1}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.previous')}
            </button>
            <span class="px-4 text-sm text-gray-600 dark:text-gray-400">
              {translateApp(lang, 'media.page', {
                current: pagination.value.currentPage,
                total: pagination.value.totalPages,
              })}
            </span>
            <button
              onClick$={() => loadMedia(pagination.value.currentPage + 1)}
              disabled={pagination.value.currentPage === pagination.value.totalPages}
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
            >
              {translateApp(lang, 'common.next')}
            </button>
          </div>
        )}

        {/* Edit Modal - Matching Vue Dashboard */}
        {showEditModal.value && editingMedia.value && (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick$={() => {
              showEditModal.value = false;
              editingMedia.value = null;
            }}
          >
            <div
              class="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-gray-800"
              onClick$={(e) => e.stopPropagation()}
            >
              <div class="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">{translateApp(lang, 'media.editMedia')}</h2>
              </div>

              <div class="p-6">
                <div class="grid gap-6 lg:grid-cols-2">
                  {/* Left Column: Preview and File Info */}
                  <div class="space-y-4">
                    {/* Media Preview */}
                    <div class="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                      <div class="aspect-video overflow-hidden rounded-t-lg">
                        {(editingMedia.value.mimeType || (editingMedia.value as any).mime_type)?.startsWith('image') ? (
                          <img
                            src={editingMedia.value.url}
                            alt={editingMedia.value.altText || (editingMedia.value as any).alt_text || editingMedia.value.name}
                            width="800"
                            height="450"
                            class="h-full w-full object-contain"
                          />
                        ) : (editingMedia.value.mimeType || (editingMedia.value as any).mime_type)?.startsWith('video') ? (
                          <video src={editingMedia.value.url} controls class="h-full w-full" />
                        ) : (
                          <div class="flex h-full items-center justify-center">
                            <span class="text-6xl">📄</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File Information */}
                    <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
                      <h3 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {translateApp(lang, 'media.fileName')}
                      </h3>
                      <dl class="space-y-2 text-sm">
                        <div class="flex justify-between">
                          <dt class="font-medium text-gray-500 dark:text-gray-400">
                            {translateApp(lang, 'media.fileName')}:
                          </dt>
                          <dd class="text-gray-900 dark:text-gray-100">
                            {(editingMedia.value as any).file_name || editingMedia.value.name}
                          </dd>
                        </div>
                        <div class="flex justify-between">
                          <dt class="font-medium text-gray-500 dark:text-gray-400">
                            {translateApp(lang, 'media.fileSize')}:
                          </dt>
                          <dd class="text-gray-900 dark:text-gray-100">
                            {formatSize(editingMedia.value.size || 0)}
                          </dd>
                        </div>
                        <div class="flex justify-between">
                          <dt class="font-medium text-gray-500 dark:text-gray-400">
                            {translateApp(lang, 'media.mimeType')}:
                          </dt>
                          <dd class="text-gray-900 dark:text-gray-100">
                            {editingMedia.value.mimeType || (editingMedia.value as any).mime_type || ''}
                          </dd>
                        </div>
                        <div class="flex justify-between">
                          <dt class="font-medium text-gray-500 dark:text-gray-400">
                            {translateApp(lang, 'media.uploadedOn')}:
                          </dt>
                          <dd class="text-gray-900 dark:text-gray-100">
                            {editingMedia.value.createdAt
                              ? new Date(editingMedia.value.createdAt).toLocaleString()
                              : ''}
                          </dd>
                        </div>
                        {editingMedia.value.url && (
                          <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                            <dt class="mb-1 font-medium text-gray-500 dark:text-gray-400">URL:</dt>
                            <dd class="break-all">
                              <a
                                href={editingMedia.value.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-primary-600 hover:underline dark:text-primary-400"
                              >
                                {editingMedia.value.url}
                              </a>
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  {/* Right Column: Edit Form */}
                  <div class="space-y-4">
                    {/* Name */}
                    <div>
                      <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {translateApp(lang, 'media.fileName')}
                      </label>
                      <input
                        type="text"
                        value={editingMedia.value.name}
                        onInput$={(e: any) => (editingMedia.value.name = e.target.value)}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                      />
                    </div>

                    {/* Alt Text */}
                    <div>
                      <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {translateApp(lang, 'media.altText')}
                      </label>
                      <input
                        type="text"
                        value={editingMedia.value.altText || (editingMedia.value as any).alt_text || ''}
                        onInput$={(e: any) => {
                          editingMedia.value.altText = e.target.value;
                          (editingMedia.value as any).alt_text = e.target.value;
                        }}
                        placeholder="Alternative text for accessibility"
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {translateApp(lang, 'media.description')}
                      </label>
                      <textarea
                        rows={4}
                        value={(editingMedia.value as any).description || ''}
                        onInput$={(e: any) => ((editingMedia.value as any).description = e.target.value)}
                        placeholder="Description of the media file"
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                      />
                    </div>

                    {/* Folder */}
                    <div>
                      <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {translateApp(lang, 'media.folders')}
                      </label>
                      <select
                        value={String((editingMedia.value as any).folder_id || '')}
                        onChange$={(e: any) => {
                          (editingMedia.value as any).folder_id = e.target.value
                            ? Number(e.target.value)
                            : null;
                        }}
                        class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                      >
                        <option value="">{`${translateApp(lang, 'media.all')} (${translateApp(lang, 'media.noFolders')})`}</option>
                        {folders.value.map((folder) => (
                          <option key={folder.id} value={String(folder.id)}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tags */}
                    <div>
                      <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        {translateApp(lang, 'media.tags')}
                      </label>
                      <div class="space-y-2">
                        {/* Tag Input */}
                        <div class="flex gap-2">
                          <input
                            type="text"
                            value={newTagName.value}
                            onInput$={(e: any) => (newTagName.value = e.target.value)}
                            onKeyDown$={(e: any) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTag();
                              }
                            }}
                            placeholder={translateApp(lang, 'media.addTags')}
                            class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                          />
                          <button
                            onClick$={addTag}
                            type="button"
                            class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                          >
                            {translateApp(lang, 'common.add')}
                          </button>
                        </div>
                        {/* Tags List */}
                        {editingMedia.value.tagNames && editingMedia.value.tagNames.length > 0 ? (
                          <div class="flex flex-wrap gap-2">
                            {editingMedia.value.tagNames.map((tag: string) => (
                              <span
                                key={tag}
                                class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                              >
                                {tag}
                                <button
                                  onClick$={() => removeTag(tag)}
                                  type="button"
                                  class="ml-1 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p class="text-xs text-gray-500 dark:text-gray-400">
                            {translateApp(lang, 'media.noTags') || 'No tags'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div class="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                <div class="flex justify-end gap-2">
                  <button
                    onClick$={() => {
                      showEditModal.value = false;
                      editingMedia.value = null;
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    {translateApp(lang, 'common.cancel')}
                  </button>
                  <button
                    onClick$={saveMedia}
                    class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                  >
                    {translateApp(lang, 'common.save')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Folder Modal - Matching Vue Dashboard */}
        {showFolderModal.value && (
          <div
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick$={() => {
              showFolderModal.value = false;
              folderForm.value = { name: '', description: '' };
            }}
          >
            <div
              class="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800"
              onClick$={(e) => e.stopPropagation()}
            >
              <div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {translateApp(lang, 'media.createFolder')}
                </h2>
              </div>
              <div class="px-6 py-4 space-y-4">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'media.folderName')}
                  </label>
                  <input
                    type="text"
                    value={folderForm.value.name}
                    onInput$={(e: any) => (folderForm.value.name = e.target.value)}
                    placeholder={translateApp(lang, 'media.folderName')}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {translateApp(lang, 'media.description')}
                  </label>
                  <textarea
                    rows={3}
                    value={folderForm.value.description}
                    onInput$={(e: any) => (folderForm.value.description = e.target.value)}
                    placeholder={translateApp(lang, 'media.folderDescription')}
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </div>
              <div class="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900">
                <div class="flex justify-end gap-2">
                  <button
                    onClick$={() => {
                      showFolderModal.value = false;
                      folderForm.value = { name: '', description: '' };
                    }}
                    class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                  >
                    {translateApp(lang, 'common.cancel')}
                  </button>
                  <button
                    onClick$={createFolder}
                    class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
                  >
                    {translateApp(lang, 'common.create')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Media Library - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage media files',
    },
  ],
};
