/**
 * Skill entity types
 */
import type { Media } from './media';

export interface Skill {
  id: number;
  name: string;
  slug: string;
  description?: string;
  iconHint?: string;
  createdAt: string;
  updatedAt: string;
  projectsCount?: number;
  icon?: Media;
}

export interface SkillCreateInput {
  name: string;
  slug?: string;
  description?: string;
  iconHint?: string;
  iconId?: number;
}

export interface SkillUpdateInput extends Partial<SkillCreateInput> {
  id: number;
}
