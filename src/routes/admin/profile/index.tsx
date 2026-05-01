import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { useTranslate, translateApp } from '../../../lib/i18n/useTranslate';
import { mockAuth } from '../../../lib/auth/mock-auth';

/**
 * User profile route loader
 */
export const useUserProfile = routeLoader$(async ({ cookie }) => {
  try {
    const session = mockAuth.getSession(cookie);
    if (!session) {
      throw new Error('Unauthorized');
    }
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    return session.user;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to load user profile');
  }
});

/**
 * Update profile route action
 */
export const useUpdateProfile = routeAction$(
  async (data, { cookie }) => {
    const session = mockAuth.getSession(cookie);
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const updated = mockAuth.updateUser(session.user.id, {
      name: data.name as string,
      email: data.email as string,
    });

    if (!updated) {
      return {
        success: false,
        error: 'Failed to update profile',
      };
    }

    return {
      success: true,
      user: updated,
    };
  },
  zod$({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Please enter a valid email address'),
  }),
);

/**
 * Change password route action
 */
export const useChangePassword = routeAction$(
  async (data, { cookie }) => {
    const session = mockAuth.getSession(cookie);
    if (!session) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    const newPassword = data.newPassword as string;
    const confirmPassword = data.confirmPassword as string;

    if (newPassword !== confirmPassword) {
      return {
        success: false,
        error: 'New passwords do not match',
      };
    }

    if (newPassword.length < 8) {
      return {
        success: false,
        error: 'Password must be at least 8 characters long',
      };
    }

    // In a real app, verify current password and update password
    // For now, just return success
    return {
      success: true,
    };
  },
  zod$({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  }),
);

/**
 * User profile page
 */
export default component$(() => {
  const user = useUserProfile();
  const updateProfileAction = useUpdateProfile();
  const changePasswordAction = useChangePassword();
  const { lang } = useTranslate();

  return (
    <>
      {/* Component: ProfilePage */}
      <div>
      <PageHeader
        title={translateApp(lang, 'profile.title')}
        description={translateApp(lang, 'profile.description')}
      />

      <div class="space-y-6">
        {/* Profile Information */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {translateApp(lang, 'profile.profileInformation')}
          </h2>
          <Form action={updateProfileAction} class="space-y-4">
            <div>
              <label
                for="name"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {translateApp(lang, 'profile.fullName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={user.value.name}
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {updateProfileAction.value?.failed && updateProfileAction.value.fieldErrors?.name && (
                <p class="mt-1 text-sm text-red-600">
                  {updateProfileAction.value.fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label
                for="email"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {translateApp(lang, 'profile.emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={user.value.email}
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {updateProfileAction.value?.failed && updateProfileAction.value.fieldErrors?.email && (
                <p class="mt-1 text-sm text-red-600">
                  {updateProfileAction.value.fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground">
                {translateApp(lang, 'profile.role')}
              </label>
              <p class="mt-1 text-sm text-gray-600 dark:text-gray-400 capitalize">
                {user.value?.role 
                  ? String(user.value.role).replace(/_/g, ' ')
                  : (user.value as any)?.roles?.map((r: any) => r.name || r).join(', ') || 'N/A'}
              </p>
            </div>
            {updateProfileAction.value?.failed && (updateProfileAction.value as any).error && (
              <div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {(updateProfileAction.value as any).error}
              </div>
            )}
            {updateProfileAction.value?.success && (
              <div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
                {translateApp(lang, 'profile.profileUpdatedSuccess')}
              </div>
            )}
            <button
              type="submit"
              disabled={updateProfileAction.isRunning}
              class="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {updateProfileAction.isRunning ? translateApp(lang, 'settings.saving') : translateApp(lang, 'profile.saveChanges')}
            </button>
          </Form>
        </div>

        {/* Change Password */}
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            {translateApp(lang, 'profile.changePassword')}
          </h2>
          <Form action={changePasswordAction} class="space-y-4">
            <div>
              <label
                for="current-password"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {translateApp(lang, 'profile.currentPassword')}
              </label>
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {changePasswordAction.value?.failed && changePasswordAction.value.fieldErrors?.currentPassword && (
                <p class="mt-1 text-sm text-red-600">
                  {changePasswordAction.value.fieldErrors.currentPassword}
                </p>
              )}
            </div>
            <div>
              <label
                for="new-password"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {translateApp(lang, 'profile.newPassword')}
              </label>
              <input
                id="new-password"
                name="newPassword"
                type="password"
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {changePasswordAction.value?.failed && changePasswordAction.value.fieldErrors?.newPassword && (
                <p class="mt-1 text-sm text-red-600">
                  {changePasswordAction.value.fieldErrors.newPassword}
                </p>
              )}
            </div>
            <div>
              <label
                for="confirm-password"
                class="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {translateApp(lang, 'profile.confirmNewPassword')}
              </label>
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                class="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {changePasswordAction.value?.failed && changePasswordAction.value.fieldErrors?.confirmPassword && (
                <p class="mt-1 text-sm text-red-600">
                  {changePasswordAction.value.fieldErrors.confirmPassword}
                </p>
              )}
            </div>
            {changePasswordAction.value?.failed && (changePasswordAction.value as any).error && (
              <div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
                {(changePasswordAction.value as any).error}
              </div>
            )}
            {changePasswordAction.value?.success && (
              <div class="rounded-md bg-green-50 p-3 text-sm text-green-800">
                {translateApp(lang, 'profile.passwordChangedSuccess')}
              </div>
            )}
            <button
              type="submit"
              disabled={changePasswordAction.isRunning}
              class="rounded-lg bg-primary-600 text-white px-4 py-2 text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {changePasswordAction.isRunning ? translateApp(lang, 'profile.changing') : translateApp(lang, 'profile.changePasswordButton')}
            </button>
          </Form>
        </div>
      </div>
    </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Profile - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage your profile settings',
    },
  ],
};
