/**
 * Lazy SweetAlert2 — keeps ~50KB+ out of the default admin bundle.
 */
import { loadSweetAlertCSS } from './load-sweetalert-css';

type SwalModule = typeof import('sweetalert2').default;

let swalPromise: Promise<SwalModule> | null = null;

export async function getSwal(): Promise<SwalModule> {
  if (!swalPromise) {
    swalPromise = import('sweetalert2').then((mod) => {
      loadSweetAlertCSS();
      return mod.default;
    });
  }
  return swalPromise;
}
