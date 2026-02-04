import { $ } from '@builder.io/qwik';
import Swal from 'sweetalert2';

/**
 * Translation strings interface for useSwal
 */
export interface SwalTranslations {
  confirmTitle?: string;
  yes?: string;
  no?: string;
  alertTitle?: string;
  ok?: string;
  successTitle?: string;
  errorTitle?: string;
  warningTitle?: string;
}

/**
 * SweetAlert2 wrapper hook for Qwik
 * Provides confirmation dialogs, alerts, success/error messages
 * Must be used inside a Qwik component
 * 
 * IMPORTANT: To avoid serialization issues, pass pre-computed translation strings.
 * Do NOT call useTranslate() inside this hook - it will cause SSR serialization errors.
 * 
 * @param translations - Optional pre-computed translation strings to avoid serialization issues
 */
export function useSwal(translations?: SwalTranslations) {
  // Use provided translations or fallback to English defaults
  // This ensures no functions are captured in the closure
  // IMPORTANT: We do NOT call useTranslate() here to avoid serialization issues
  const confirmTitle = translations?.confirmTitle || 'Confirm';
  const yes = translations?.yes || 'Yes';
  const no = translations?.no || 'No';
  const alertTitle = translations?.alertTitle || 'Alert';
  const ok = translations?.ok || 'OK';
  const successTitle = translations?.successTitle || 'Success';
  const errorTitle = translations?.errorTitle || 'Error';
  const warningTitle = translations?.warningTitle || 'Warning';

  const confirm = $((message: string, options: any = {}) => {
    return Swal.fire({
      title: options.title || confirmTitle,
      text: message,
      icon: options.icon || 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmText || yes,
      cancelButtonText: options.cancelText || no,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      ...options,
    });
  });

  const alert = $((message: string, options: any = {}) => {
    return Swal.fire({
      title: options.title || alertTitle,
      text: message,
      icon: options.icon || 'info',
      confirmButtonText: options.confirmText || ok,
      confirmButtonColor: '#2563eb',
      ...options,
    });
  });

  const success = $((message: string, options: any = {}) => {
    return Swal.fire({
      title: options.title || successTitle,
      text: message,
      icon: 'success',
      confirmButtonText: options.confirmText || ok,
      confirmButtonColor: '#10b981',
      ...options,
    });
  });

  const error = $((message: string, options: any = {}) => {
    return Swal.fire({
      title: options.title || errorTitle,
      text: message,
      icon: 'error',
      confirmButtonText: options.confirmText || ok,
      confirmButtonColor: '#ef4444',
      ...options,
    });
  });

  const warning = $((message: string, options: any = {}) => {
    return Swal.fire({
      title: options.title || warningTitle,
      text: message,
      icon: 'warning',
      confirmButtonText: options.confirmText || ok,
      confirmButtonColor: '#f59e0b',
      ...options,
    });
  });

  return {
    confirm,
    alert,
    success,
    error,
    warning,
  };
}
