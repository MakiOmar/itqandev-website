import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { LoginForm } from '../../../components/auth/LoginForm';
import { auth } from '../../../lib/auth';
import { getConfig } from '../../../lib/config';

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
  async (data, { cookie, redirect: redirectFn }) => {
    try {
      const session = await auth.login(
        {
          email: data.email,
          password: data.password,
        },
        cookie,
      );

      if (!session) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Redirect to admin home page
      const config = getConfig();
      throw redirectFn(302, config.routes.admin.home);
    } catch (error: any) {
      // Re-throw redirects
      if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
        throw error;
      }
      
      // For other errors, return error response
      return {
        success: false,
        error: error?.message || 'Login failed. Please try again.',
      };
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
