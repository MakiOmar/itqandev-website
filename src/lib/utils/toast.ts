import { loadSweetAlertCSS } from './load-sweetalert-css';

/**
 * Toast notification types
 */
type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Show toast notification
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 3000,
): void {
  // Only run on client side
  if (typeof window === 'undefined') return;
  
  // Lazy load CSS and SweetAlert2 on first use
  loadSweetAlertCSS();
  
  // Dynamic import to avoid SSR issues
  import('sweetalert2').then((Swal) => {
    const Toast = Swal.default.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.default.stopTimer);
        toast.addEventListener('mouseleave', Swal.default.resumeTimer);
      },
    });

    Toast.fire({
      icon: type,
      title: message,
    });
  });
}

/**
 * Show success toast
 */
export function showSuccess(message: string, duration?: number): void {
  showToast(message, 'success', duration);
}

/**
 * Show error toast
 */
export function showError(message: string, duration?: number): void {
  showToast(message, 'error', duration);
}

/**
 * Show info toast
 */
export function showInfo(message: string, duration?: number): void {
  showToast(message, 'info', duration);
}

/**
 * Show warning toast
 */
export function showWarning(message: string, duration?: number): void {
  showToast(message, 'warning', duration);
}
