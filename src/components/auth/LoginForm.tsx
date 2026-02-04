import { component$ } from '@builder.io/qwik';
import type { ActionStore } from '@builder.io/qwik-city';
import { Form } from '@builder.io/qwik-city';
import { useTranslate } from '../../lib/i18n/useTranslate';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

/**
 * Login form component props
 */
interface LoginFormProps {
  action: ActionStore<any, any>;
}

/**
 * Login form component
 * Can be used standalone or within a page
 * Receives the routeAction$ as a prop (must be defined in route file)
 */
export const LoginForm = component$<LoginFormProps>((props) => {
  const loginAction = props.action;
  const { t } = useTranslate();

  return (
    <>
      {/* Component: LoginForm */}
      <div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 transition-colors duration-300">
        <div class="w-full max-w-md space-y-8 bg-white dark:bg-slate-800 rounded-lg shadow-lg dark:shadow-slate-900/50 p-8 transition-colors duration-300">
          {/* Language Switcher */}
          <div class="flex justify-end">
            <LanguageSwitcher />
          </div>
          
          <div class="text-center">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-slate-100 transition-colors">{t('auth.login')}</h1>
            <p class="mt-2 text-sm text-gray-600 dark:text-slate-400 transition-colors">
              Sign in to your account to continue
            </p>
          </div>

          <Form action={loginAction} class="space-y-6">
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {t('auth.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder={t('auth.enterEmail')}
              />
              {loginAction.value?.failed && loginAction.value.fieldErrors?.email && (
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  {loginAction.value.fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700 dark:text-slate-300 transition-colors"
              >
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-gray-900 dark:text-slate-100 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
                placeholder={t('auth.enterPassword')}
              />
              {loginAction.value?.failed && loginAction.value.fieldErrors?.password && (
                <p class="mt-1 text-sm text-red-600 dark:text-red-400">
                  {loginAction.value.fieldErrors.password}
                </p>
              )}
            </div>

            {loginAction.value?.failed && (loginAction.value as any).error && (
              <div class="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-800 dark:text-red-300 transition-colors">
                {(loginAction.value as any).error}
              </div>
            )}

            <button
              type="submit"
              disabled={loginAction.isRunning}
              class="w-full rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loginAction.isRunning ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </Form>
        </div>
      </div>
    </>
  );
});
