import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { LoginForm } from '../../../../components/auth/LoginForm';
import { auth } from '../../../../lib/auth';
import { routesFromPreferredCookie } from '../../../../lib/constants/routes';

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

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
  return <LoginForm action={loginAction} />;
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
