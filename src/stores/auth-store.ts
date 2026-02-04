import { createContextId } from '@builder.io/qwik';
import type { AuthSession } from '../lib/auth/types';

/**
 * Authentication context
 */
export const AuthContext = createContextId<{
  session: AuthSession | null;
  isLoading: boolean;
}>('auth-context');
