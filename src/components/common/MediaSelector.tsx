import { component$, useSignal, $, type QRL } from '@builder.io/qwik';
import { useTranslate, translateApp } from '../../lib/i18n/useTranslate';
import { MediaLibrary } from '../media/MediaLibrary';
import type { Media } from '../../types/media';

interface MediaSelectorProps {
  title?: string;
  accept?: string;
  callback?: string; // For identifying selection type (hero, video, featured_image) - kept for compatibility
  onSelect: QRL<(media: Media) => void>;
  onClose: QRL<() => void>;
}

/**
 * MediaSelector component - modal for selecting media files
 * Uses standalone MediaLibrary component instead of iframe
 */
export const MediaSelector = component$<MediaSelectorProps>((props) => {
  const { lang } = useTranslate();
  const isOpen = useSignal(true);

  const handleClose = $(() => {
    isOpen.value = false;
    props.onClose();
  });

  const handleSelect = $((media: Media) => {
    props.onSelect(media);
    handleClose();
  });

  if (!isOpen.value) {
    return null;
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        class="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick$={handleClose}
      />
      
      {/* Modal */}
      <div class="relative z-10 w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {props.title || translateApp(lang, 'media.selectMedia') || 'Select Media'}
          </h2>
          <button
            onClick$={handleClose}
            class="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div class="flex-1 overflow-y-auto p-6 min-h-0">
          <MediaLibrary
            accept={props.accept}
            onSelect={handleSelect}
            selectionMode={true}
          />
        </div>
      </div>
    </div>
  );
});
