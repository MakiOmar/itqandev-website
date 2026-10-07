import { component$ } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { LoginForm } from '../../../../components/auth/LoginForm';
import { auth } from '../../../../lib/auth';
import { redirectSignedInFromLogin } from '../../../../lib/loaders/admin-auth';
import { getConfig } from '../../../../lib/config';
import {
  authSessionCookieOptions,
  expireHostOnlyAuthSessionCookie,
} from '../../../../lib/auth/session-lifetime';
import { routesFromPreferredCookie, useAppRoutes } from '../../../../lib/constants/routes';

export const onGet: RequestHandler = async ({ cookie, redirect: redirectFn }) => {
  await redirectSignedInFromLogin(cookie, redirectFn);
};

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  /** Unchecked checkboxes are omitted from form data. */
  remember: z.string().optional(),
});

const sessionSyncSchema = z.object({
  sessionJson: z.string().min(1, 'Session payload is required'),
});

/**
 * Dev-only: persist HttpOnly auth cookie after browser login (no outbound API call).
 */
export const useSyncAuthSessionAction = routeAction$(
  async (data, { cookie, fail }) => {
    let session: { user?: { id?: string | number }; token?: string; expiresAt?: number; remember?: boolean };
    try {
      session = JSON.parse(data.sessionJson);
    } catch {
      return fail(400, { error: 'Invalid session payload' });
    }

    if (!session?.user?.id || !session?.token || !session?.expiresAt || session.expiresAt <= Date.now()) {
      return fail(400, { error: 'Invalid or expired session' });
    }

    const config = getConfig();
    cookie.set(config.auth.cookieName, data.sessionJson, authSessionCookieOptions(session.remember === true));

    return { success: true as const };
  },
  zod$(sessionSyncSchema),
);

/**
 * Login route action - must be in route file for Qwik to create endpoint
 */
export const useLoginAction = routeAction$(
  async (data, { cookie, headers, redirect: redirectFn, fail }) => {
    let session: Awaited<ReturnType<typeof auth.login>>;
    try {
      session = await auth.login(
        {
          email: data.email,
          password: data.password,
          remember: data.remember === 'on' || data.remember === '1' || data.remember === 'true',
        },
        cookie,
      );
    } catch (error: any) {
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

    if (!session) {
      return fail(401, {
        error: 'Invalid email or password',
      });
    }

    expireHostOnlyAuthSessionCookie(headers);

    // Outside the try: Qwik's RedirectMessage has no fields to detect, and swallowing it leaves the q-data request unanswered (404).
    throw redirectFn(302, routesFromPreferredCookie(cookie).ADMIN.HOME);
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
