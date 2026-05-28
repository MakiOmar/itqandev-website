import { API_ENDPOINTS } from '../api/endpoints';
import {
  exportContentJson,
  importContentJson,
  type ContentImportMode,
  type ContentImportResult,
} from './content-import-export';

export type CategoryImportMode = ContentImportMode;
export type CategoryImportResult = ContentImportResult;

export async function exportCategoriesJson(locale: string, ids?: string[]): Promise<void> {
  return exportContentJson(API_ENDPOINTS.CATEGORIES.EXPORT, 'categories', locale, ids);
}

export async function importCategoriesJson(
  locale: string,
  payload: unknown,
  mode: CategoryImportMode,
): Promise<CategoryImportResult> {
  return importContentJson(API_ENDPOINTS.CATEGORIES.IMPORT, locale, payload, mode);
}
