import { loadSweetAlertCSS } from '../../lib/utils/load-sweetalert-css';

/**
 * Show confirmation dialog using SweetAlert2
 */
export async function showConfirmDialog(
  title: string,
  text: string,
  confirmText: string = 'Yes, do it!',
  cancelText: string = 'Cancel',
): Promise<boolean> {
  // Only run on client side
  if (typeof window === 'undefined') return false;
  
  // Lazy load CSS and SweetAlert2 on first use
  loadSweetAlertCSS();
  
  // Dynamic import to avoid SSR issues
  const Swal = await import('sweetalert2');
  const result = await Swal.default.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });

  return result.isConfirmed;
}

/**
 * Show success dialog
 */
export async function showSuccessDialog(title: string, text?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  loadSweetAlertCSS();
  const Swal = await import('sweetalert2');
  await Swal.default.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'OK',
  });
}

/**
 * Show error dialog
 */
export async function showErrorDialog(title: string, text?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  loadSweetAlertCSS();
  const Swal = await import('sweetalert2');
  await Swal.default.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'OK',
  });
}
