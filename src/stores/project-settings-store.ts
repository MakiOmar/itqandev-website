import { createContextId } from '@builder.io/qwik';
import type { ProjectSettings } from '../lib/api/project-settings';

/**
 * Project settings context
 * Stores project-specific settings fetched from Laravel
 */
export const ProjectSettingsContext = createContextId<{
  settings: ProjectSettings;
  isLoading: boolean;
  error: string | null;
}>('project-settings-context');
