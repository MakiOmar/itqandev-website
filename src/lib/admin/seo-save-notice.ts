import { useVisibleTask$ } from '@builder.io/qwik';
import { showWarning } from '../utils/toast';

/** Query flag a create action adds when the record saved but its SEO row did not. */
export const SEO_SAVE_FAILED_QUERY = 'seo_save_failed';

export function withSeoSaveFailedFlag(href: string, failed: boolean): string {
  if (!failed) {
    return href;
  }
  return `${href}${href.includes('?') ? '&' : '?'}${SEO_SAVE_FAILED_QUERY}=1`;
}

/** Edit screens: warn once after a create redirect flagged a failed SEO save, then drop the flag. */
export function useSeoSaveFailedNotice(message: string): void {
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(SEO_SAVE_FAILED_QUERY) !== '1') {
      return;
    }
    showWarning(message);
    url.searchParams.delete(SEO_SAVE_FAILED_QUERY);
    window.history.replaceState(window.history.state, '', url.toString());
  });
}
