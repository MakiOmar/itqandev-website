import { useStore, useSignal, useComputed$, $ } from '@builder.io/qwik';
import { useSwal } from './useSwal';

/**
 * Form state interface
 */
export interface FormState<T extends Record<string, any>> {
  form: T;
  errors: { value: Record<string, string> } | Record<string, string>;
  isDirty: { value: boolean } | boolean;
  isSubmitting: { value: boolean } | boolean;
  hasErrors: { value: boolean } | boolean;
  reset: () => void;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: () => void;
  setFieldError: (field: string, message: string) => void;
  clearFieldError: (field: string) => void;
  validate: (validator: (form: T) => Promise<void> | void) => Promise<boolean>;
  watchDirty: () => void;
}

/**
 * Hook for form state management
 * @param initialData - Initial form data
 * @param options - Configuration options
 * @returns Form state and methods
 */
export function useForm<T extends Record<string, any>>(
  initialData: T = {} as T,
  options: { autoWatchDirty?: boolean } = {}
): FormState<T> {
  const { error: showError } = useSwal();

  const form = useStore<T>({ ...initialData });
  const errors = useSignal<Record<string, string>>({});
  const isDirty = useSignal(false);
  const isSubmitting = useSignal(false);
  const originalData = useSignal<T>(JSON.parse(JSON.stringify(initialData)));

  const hasErrors = useComputed$(() => {
    return Object.keys(errors.value).length > 0;
  });

  const reset = $(() => {
    Object.assign(form, originalData.value);
    errors.value = {};
    isDirty.value = false;
  });

  const setErrors = $((newErrors: Record<string, string>) => {
    errors.value = newErrors || {};
  });

  const clearErrors = $(() => {
    errors.value = {};
  });

  const setFieldError = $((field: string, message: string) => {
    errors.value = { ...errors.value, [field]: message };
  });

  const clearFieldError = $((field: string) => {
    const newErrors = { ...errors.value };
    delete newErrors[field];
    errors.value = newErrors;
  });

  const validate = $(async (validator: (form: T) => Promise<void> | void) => {
    try {
      clearErrors();
      await validator(form);
      return true;
    } catch (validationErrors: any) {
      if (validationErrors.errors) {
        setErrors(validationErrors.errors);
      } else {
        await showError(validationErrors.message || 'Validation failed');
      }
      return false;
    }
  });

  const watchDirty = $(() => {
    isDirty.value = JSON.stringify(form) !== JSON.stringify(originalData.value);
  });

  return {
    form,
    errors,
    isDirty,
    isSubmitting,
    hasErrors,
    reset,
    setErrors,
    clearErrors,
    setFieldError,
    clearFieldError,
    validate,
    watchDirty,
  } as FormState<T>;
}
