import { $ } from '@builder.io/qwik';
import type { SweetAlertIcon } from 'sweetalert2';
import { getSwal } from '../utils/swal-fire';

function swalIcon(value: unknown, fallback: SweetAlertIcon): SweetAlertIcon {
  const icons: SweetAlertIcon[] = ['success', 'error', 'warning', 'info', 'question'];
  return typeof value === 'string' && icons.includes(value as SweetAlertIcon)
    ? (value as SweetAlertIcon)
    : fallback;
}

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
 * SweetAlert2 wrapper hook for Qwik (dynamic import — non-blocking bundle).
 */
export function useSwal(translations?: SwalTranslations) {
  const confirmTitle = translations?.confirmTitle || 'Confirm';
  const yes = translations?.yes || 'Yes';
  const no = translations?.no || 'No';
  const alertTitle = translations?.alertTitle || 'Alert';
  const ok = translations?.ok || 'OK';
  const successTitle = translations?.successTitle || 'Success';
  const errorTitle = translations?.errorTitle || 'Error';
  const warningTitle = translations?.warningTitle || 'Warning';

  const confirm = $(async (message: string, options: Record<string, unknown> = {}) => {
    const Swal = await getSwal();
    return Swal.fire({
      title: (options.title as string) || confirmTitle,
      text: message,
      icon: swalIcon(options.icon, 'question'),
      showCancelButton: true,
      confirmButtonText: (options.confirmText as string) || yes,
      cancelButtonText: (options.cancelText as string) || no,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
      ...options,
    });
  });

  const alert = $(async (message: string, options: Record<string, unknown> = {}) => {
    const Swal = await getSwal();
    return Swal.fire({
      title: (options.title as string) || alertTitle,
      text: message,
      icon: swalIcon(options.icon, 'info'),
      confirmButtonText: (options.confirmText as string) || ok,
      confirmButtonColor: '#2563eb',
      ...options,
    });
  });

  const success = $(async (message: string, options: Record<string, unknown> = {}) => {
    const Swal = await getSwal();
    return Swal.fire({
      title: (options.title as string) || successTitle,
      text: message,
      icon: 'success',
      confirmButtonText: (options.confirmText as string) || ok,
      confirmButtonColor: '#10b981',
      ...options,
    });
  });

  const error = $(async (message: string, options: Record<string, unknown> = {}) => {
    const Swal = await getSwal();
    return Swal.fire({
      title: (options.title as string) || errorTitle,
      text: message,
      icon: 'error',
      confirmButtonText: (options.confirmText as string) || ok,
      confirmButtonColor: '#ef4444',
      ...options,
    });
  });

  const warning = $(async (message: string, options: Record<string, unknown> = {}) => {
    const Swal = await getSwal();
    return Swal.fire({
      title: (options.title as string) || warningTitle,
      text: message,
      icon: 'warning',
      confirmButtonText: (options.confirmText as string) || ok,
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
