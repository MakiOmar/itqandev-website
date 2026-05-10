/**
 * Skill entity types
 */
import type { Media } from './media';
import type { SkillTranslationRow } from './site-language';
import type { ContentSeoMetaRow } from './content-seo';

export interface Skill {
  id: number;
  name: string;
  slug: string;
  content_locale?: string | null;
  description?: string;
  iconHint?: string;
  translations?: SkillTranslationRow[];
  seoMetas?: ContentSeoMetaRow[];
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
  icon?: Media;
}

export interface SkillCreateInput {
  name: string;
  slug?: string;
  content_locale?: string | null;
  description?: string;
  iconHint?: string;
  iconId?: number;
  translations?: SkillTranslationRow[];
}

export interface SkillUpdateInput extends Partial<SkillCreateInput> {
  id: number;
}
