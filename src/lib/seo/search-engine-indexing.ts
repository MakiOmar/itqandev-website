/**
 * Site-wide search indexing flag from project settings (`search_engine_indexing`).
 * Default is on. Missing/invalid values stay indexable so production is not noindexed by accident.
 */
export function isSearchEngineIndexingEnabled(raw: unknown, fallback = true): boolean {
  if (raw === false || raw === 0 || raw === '0' || raw === 'false') {
    return false;
  }
  if (raw === true || raw === 1 || raw === '1' || raw === 'true') {
    return true;
  }
  return fallback;
}

/** Robots meta when the whole site or one page should stay out of search results. */
export function publicRobotsContent(opts: {
  siteIndexingEnabled: boolean;
  pageExcluded?: boolean;
}): string | undefined {
  if (!opts.siteIndexingEnabled || opts.pageExcluded === true) {
    return 'noindex, nofollow';
  }
  return undefined;
}
