import { createContextId, type Signal } from '@builder.io/qwik';
import type { AuthSession } from '../lib/auth/types';

/** Admin layout session signal from `useAdminAuth` (single loader call in layout). */
export const AdminSessionContext = createContextId<Signal<AuthSession | null>>('admin-session-context');
