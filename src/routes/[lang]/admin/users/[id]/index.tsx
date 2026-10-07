import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { Link, routeLoader$ } from '@builder.io/qwik-city';
import { PageHeader } from '../../../../../components/common/PageHeader';
import { EmptyState } from '../../../../../components/common/EmptyState';
import { UserForm } from '../../../../../components/admin/users/UserForm';
import { useTranslate, translateApp } from '../../../../../lib/i18n/useTranslate';
import { routesFromPreferredCookie, useAppRoutes } from '../../../../../lib/constants/routes';
import { adminApiClient } from '../../../../../lib/admin/admin-api-client';
import { loadRoles, loadUser, type AdminRole, type AdminUser } from '../../../../../lib/admin/user-actions';
import { useAdminAuth } from '../../layout';

export const useUserForEdit = routeLoader$(async ({ params, cookie, request, fail, redirect: redirectFn }) => {
  if (params.id === 'new') {
    throw redirectFn(302, routesFromPreferredCookie(cookie).ADMIN.USERS_NEW);
  }
  try {
    const user = await loadUser(adminApiClient(cookie, request, params.lang), params.id);
    return user ?? fail(404, { message: 'Not found' });
  } catch {
    return fail(404, { message: 'Not found' });
  }
});

export const useRolesForEditUser = routeLoader$(async ({ cookie, request, params }) => {
  try {
    return await loadRoles(adminApiClient(cookie, request, params.lang));
  } catch (err: unknown) {
    console.error('Failed to load roles:', err);
    return [] as AdminRole[];
  }
});

export default component$(() => {
  const { lang } = useTranslate();
  const R = useAppRoutes();
  const userLoader = useUserForEdit();
  const roles = useRolesForEditUser();
  const session = useAdminAuth();
  const loaded = userLoader.value;
  const user: AdminUser | null = loaded && !loaded.failed ? (loaded as AdminUser) : null;

  return (
    <>
      {/* Component: EditUserPage */}
      <PageHeader title={translateApp(lang, 'users.edit')} description={user?.email ?? ''}>
        <Link
          href={R.ADMIN.USERS}
          class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          {translateApp(lang, 'common.back')}
        </Link>
      </PageHeader>
      {user ? (
        <UserForm
          lang={lang}
          roles={roles.value}
          user={user}
          isSelf={String(user.id) === String(session.value?.user?.id ?? '')}
          listHref={R.ADMIN.USERS}
        />
      ) : (
        <EmptyState title={translateApp(lang, 'users.notFound')} />
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: 'Edit User - Dashboard',
};
