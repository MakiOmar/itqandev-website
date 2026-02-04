/**
 * Lazy load SweetAlert2 CSS to avoid render-blocking
 * Uses a non-blocking loading technique with print media trick
 */
export function loadSweetAlertCSS(): void {
  if (typeof document === 'undefined') return;
  
  // Check if already loaded
  const existing = document.querySelector('link[data-sweetalert-css]');
  if (existing) {
    return;
  }

  // Create link element directly (no dynamic import to avoid SSR issues)
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // In production, Vite will handle the path
  link.href = import.meta.env.PROD 
    ? '/assets/sweetalert2.min.css'
    : '/node_modules/sweetalert2/dist/sweetalert2.min.css';
  link.setAttribute('data-sweetalert-css', 'true');
  
  // Use print media trick to load CSS without blocking render
  link.media = 'print';
  link.onload = function() {
    if (this instanceof HTMLLinkElement) {
      this.media = 'all';
    }
  };
  
  // Defer loading using requestIdleCallback for better performance
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      document.head.appendChild(link);
    }, { timeout: 2000 });
  } else {
    // Fallback: defer with setTimeout
    setTimeout(() => {
      document.head.appendChild(link);
    }, 1);
  }
}
