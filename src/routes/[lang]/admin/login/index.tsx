import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { LoginForm } from '../../../../components/auth/LoginForm';
import { auth } from '../../../../lib/auth';
import { getConfig } from '../../../../lib/config';
import { routesFromPreferredCookie, useAppRoutes } from '../../../../lib/constants/routes';

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const sessionSyncSchema = z.object({
  sessionJson: z.string().min(1, 'Session payload is required'),
});

/**
 * Dev-only: persist HttpOnly auth cookie after browser login (no outbound API call).
 */
export const useSyncAuthSessionAction = routeAction$(
  async (data, { cookie, fail }) => {
    let session: { user?: { id?: string | number }; token?: string; expiresAt?: number };
    try {
      session = JSON.parse(data.sessionJson);
    } catch {
      return fail(400, { error: 'Invalid session payload' });
    }

    if (!session?.user?.id || !session?.token || !session?.expiresAt || session.expiresAt <= Date.now()) {
      return fail(400, { error: 'Invalid or expired session' });
    }

    const config = getConfig();
    cookie.set(config.auth.cookieName, data.sessionJson, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: import.meta.env.PROD,
      maxAge: [1, 'days'],
    });

    return { success: true as const };
  },
  zod$(sessionSyncSchema),
);

/**
 * Login route action - must be in route file for Qwik to create endpoint
 */
export const useLoginAction = routeAction$(
  async (data, { cookie, redirect: redirectFn, fail }) => {
    try {
      const session = await auth.login(
        {
          email: data.email,
          password: data.password,
        },
        cookie,
      );

      if (!session) {
        return fail(401, {
          error: 'Invalid email or password',
        });
      }

      const R = routesFromPreferredCookie(cookie);
      throw redirectFn(302, R.ADMIN.HOME);
    } catch (error: any) {
      // Re-throw redirects
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }

      // Surface backend validation errors in the same shape the form already renders.
      const fieldErrors =
        error?.errors && typeof error.errors === 'object'
          ? Object.fromEntries(
              Object.entries(error.errors).map(([field, messages]) => [
                field,
                Array.isArray(messages) ? (messages[0] as string) : String(messages),
              ]),
            )
          : undefined;

      return fail(error?.status || 500, {
        error: error?.message || 'Login failed. Please try again.',
        fieldErrors,
      });
    }
  },
  zod$(loginSchema),
);

/**
 * Login page - uses the shared LoginForm component
 */
export default component$(() => {
  const loginAction = useLoginAction();
  const syncSessionAction = useSyncAuthSessionAction();
  const R = useAppRoutes();

  return (
    <LoginForm
      action={loginAction}
      syncSessionAction={syncSessionAction}
      adminHomeUrl={R.ADMIN.HOME}
      clientSideLogin={import.meta.env.DEV}
    />
  );
});

export const head: DocumentHead = {
  title: 'Login - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Sign in to your dashboard account',
    },
  ],
};
