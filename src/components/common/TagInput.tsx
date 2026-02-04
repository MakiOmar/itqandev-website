import { component$, useSignal, useComputed$, $, type QRL } from '@builder.io/qwik';
import { useTranslate } from '../../lib/i18n/useTranslate';

export interface TagItem {
  id: string | number;
  name: string;
}

interface TagInputProps {
  value: (string | number)[];
  items: TagItem[];
  label?: string;
  placeholder?: string;
  noResultsText?: string;
  loading?: boolean;
  onValueChange: QRL<(value: (string | number)[]) => void>;
}

/**
 * TagInput component for selecting multiple items with search
 * Similar to Vue TagInput component
 */
export const TagInput = component$<TagInputProps>((props) => {
  const { t } = useTranslate();
  const searchQuery = useSignal('');
  const showSuggestions = useSignal(false);
  const blurTimeout = useSignal<ReturnType<typeof setTimeout> | null>(null);

  // Get selected items based on value IDs
  const selectedItems = useComputed$(() => {
    const selected = props.value
      .map((id) => {
        const found = props.items.find((item) => String(item.id) === String(id));
        return found;
      })
      .filter(Boolean) as TagItem[];

    // Return items in the order they appear in value
    return props.value
      .map((id) => selected.find((item) => String(item.id) === String(id)))
      .filter(Boolean) as TagItem[];
  });

  // Filter suggestions: exclude already selected items and match search query
  const filteredSuggestions = useComputed$(() => {
    if (!searchQuery.value.trim()) {
      return [];
    }

    const query = searchQuery.value.toLowerCase().trim();
    const selectedIds = props.value.map((id) => String(id));

    return props.items.filter((item) => {
      // Exclude already selected items
      if (selectedIds.includes(String(item.id))) {
        return false;
      }
      // Match search query
      return item.name?.toLowerCase().includes(query);
    });
  });

  const handleSearch = $((value: string) => {
    searchQuery.value = value;
    if (value.trim()) {
      showSuggestions.value = true;
    }
  });

  const handleFocus = $(() => {
    if (searchQuery.value.trim()) {
      showSuggestions.value = true;
    }
  });

  const handleBlur = $(() => {
    // Delay hiding suggestions to allow click events to fire
    blurTimeout.value = setTimeout(() => {
      showSuggestions.value = false;
    }, 200);
  });

  const handleEnter = $((event: KeyboardEvent) => {
    event.preventDefault();
    if (filteredSuggestions.value.length > 0) {
      selectItem(filteredSuggestions.value[0]);
    }
  });

  const handleEscape = $(() => {
    showSuggestions.value = false;
    searchQuery.value = '';
  });

  const selectItem = $((item: TagItem) => {
    const currentIds = props.value.map((id) => String(id));
    const itemId = String(item.id);

    // Don't add if already selected
    if (!currentIds.includes(itemId)) {
      currentIds.push(itemId);
      props.onValueChange(currentIds);
    }

    searchQuery.value = '';
    showSuggestions.value = false;
  });

  const removeItem = $((id: string | number) => {
    const currentIds = props.value.map((id) => String(id));
    const itemId = String(id);
    const index = currentIds.indexOf(itemId);

    if (index > -1) {
      currentIds.splice(index, 1);
      props.onValueChange(currentIds);
    }
  });

  const handleSuggestionClick = $((item: TagItem, event: MouseEvent) => {
    event.preventDefault();
    selectItem(item);
  });

  return (
    <div class="space-y-2">
      {props.label && (
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
          {props.label}
        </label>
      )}

      {/* Selected Tags */}
      {selectedItems.value.length > 0 && (
        <div class="flex flex-wrap gap-2 mb-2">
          {selectedItems.value.map((item) => (
            <span
              key={item.id}
              class="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm font-medium text-primary-800 dark:bg-primary-900 dark:text-primary-200"
            >
              {item.name}
              <button
                onClick$={() => removeItem(item.id)}
                type="button"
                class="ml-1 rounded-full text-primary-600 hover:bg-primary-200 dark:hover:bg-primary-800"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div class="relative">
        <input
          type="text"
          value={searchQuery.value}
          onInput$={(event) => handleSearch((event.target as HTMLInputElement).value)}
          onFocus$={handleFocus}
          onBlur$={handleBlur}
          onKeyDown$={(event) => {
            if (event.key === 'Enter') {
              handleEnter(event);
            } else if (event.key === 'Escape') {
              handleEscape();
            }
          }}
          placeholder={props.placeholder || 'Search and add...'}
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
        />

        {/* Suggestions Dropdown */}
        {showSuggestions.value && filteredSuggestions.value.length > 0 && (
          <div class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {filteredSuggestions.value.map((item) => (
              <button
                key={item.id}
                onMouseDown$={(event) => handleSuggestionClick(item, event)}
                type="button"
                class="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions.value &&
          searchQuery.value &&
          filteredSuggestions.value.length === 0 &&
          !props.loading && (
            <div class="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-500 shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              {props.noResultsText || 'No items found'}
            </div>
          )}
      </div>

      {/* Loading indicator */}
      {props.loading && (
        <div class="text-xs text-gray-500 dark:text-gray-400">{t('common.loading')}</div>
      )}
    </div>
  );
});
