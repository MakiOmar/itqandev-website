import { component$, useSignal, $ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import { routeLoader$, routeAction$, Form, zod$, z, useNavigate } from '@builder.io/qwik-city';
import { PageHeader } from '../../../components/common/PageHeader';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useTranslate } from '../../../lib/i18n/useTranslate';
import { useSwal } from '../../../lib/hooks/useSwal';
import { getApiClient, extractCookieHeader } from '../../../lib/api/client';
import { API_ENDPOINTS } from '../../../lib/api/endpoints';
import type { User } from '../../../lib/auth/types';

/**
 * Role interface
 */
interface Role {
  id: number;
  name: string;
}

/**
 * Users route loader
 */
export const useUsers = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    const response = await apiClient.get<User[]>(API_ENDPOINTS.USERS.LIST);
    
    // Handle paginated response
    if (response && 'data' in response && response.data) {
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data as User[];
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data as User[];
      }
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to load users:', error);
    return [];
  }
});

/**
 * Roles route loader
 */
export const useRoles = routeLoader$(async ({ cookie, request }) => {
  try {
    const cookieHeader = extractCookieHeader(cookie, request);
    const apiClient = getApiClient(cookieHeader);
    // Try /v1/roles endpoint (from Laravel API)
    const response = await apiClient.get<Role[]>('/v1/roles').catch(() => ({ data: [] }));
    
    // Handle paginated response
    if (response && 'data' in response && response.data) {
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data as Role[];
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        return data.data as Role[];
      }
    }
    
    return [];
  } catch (error: any) {
    console.error('Failed to load roles:', error);
    return [];
  }
});

/**
 * User schema
 */
const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().optional(),
  role_ids: z.union([z.array(z.number()), z.string()]).optional(),
});

/**
 * Create/Update user action
 */
export const useSaveUser = routeAction$(
  async (data) => {
    try {
      const apiClient = getApiClient();
      
      // Handle role_ids - can be array or string
      const roleIds = Array.isArray(data.role_ids) 
        ? data.role_ids 
        : typeof data.role_ids === 'string' 
          ? data.role_ids.split(',').map(id => Number(id)).filter(id => !isNaN(id))
          : [];

      const payload: any = {
        name: data.name,
        email: data.email,
        role_ids: roleIds,
      };
      
      // Only include password if provided
      if (data.password) {
        payload.password = data.password;
      }

      const id = typeof data.id === 'string' ? Number(data.id) : data.id;
      if (id) {
        // Update existing user
        await apiClient.put(API_ENDPOINTS.USERS.UPDATE(String(id)), payload);
      } else {
        // Create new user
        await apiClient.post(API_ENDPOINTS.USERS.CREATE, payload);
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save user',
      };
    }
  },
  zod$(userSchema.extend({ id: z.union([z.string(), z.number()]).optional() })),
);

/**
 * Delete user action
 */
export const useDeleteUser = routeAction$(
  async (data, { fail }) => {
    try {
      const apiClient = getApiClient();
      await apiClient.delete(API_ENDPOINTS.USERS.DELETE(data.userId as string));
      return { success: true };
    } catch (error: any) {
      return fail(500, { message: error.message || 'Failed to delete user' });
    }
  },
  zod$({
    userId: z.string(),
  }),
);

/**
 * User management page (Admin only) - Matching Vue Dashboard
 */
export default component$(() => {
  const { t } = useTranslate();
  const { confirm, error: showError, success } = useSwal();
  const usersLoader = useUsers();
  const rolesLoader = useRoles();
  const saveAction = useSaveUser();
  const deleteAction = useDeleteUser();
  const navigate = useNavigate();

  const users = useSignal(usersLoader.value);
  const roles = useSignal(rolesLoader.value);
  const loading = useSignal(false);
  const showForm = useSignal(false);
  const editingUserId = useSignal<number | null>(null);
  
  const formUser = useSignal({
    id: null as number | null,
    name: '',
    email: '',
    password: '',
    role_ids: [] as number[],
  });

  const resetForm = $(() => {
    formUser.value = {
      id: null,
      name: '',
      email: '',
      password: '',
      role_ids: [],
    };
    editingUserId.value = null;
    showForm.value = false;
  });

  const editUser = $((user: any) => {
    const userId = typeof user.id === 'string' ? Number(user.id) : user.id;
    formUser.value = {
      id: userId,
      name: user.name || '',
      email: user.email || '',
      password: '',
      role_ids: (user.roles as any)?.map((r: any) => typeof r.id === 'string' ? Number(r.id) : r.id) ?? [],
    };
    editingUserId.value = userId;
    showForm.value = true;
  });

  // Pre-compute translation strings to avoid serialization issues
  const saveTranslations = {
    successTitle: String(t('common.success')),
    updatedText: String(t('common.updated')),
    createdText: String(t('common.created')),
  };
  const deleteTranslations = {
    confirmText: String(t('users.deleteConfirm')),
    title: String(t('common.delete')),
    successTitle: String(t('common.success')),
    deletedText: String(t('common.deleted')),
    failedText: String(t('users.deleteFailed')),
  };

  const handleSave = $(async () => {
    const formData = new FormData();
    formData.append('name', formUser.value.name);
    formData.append('email', formUser.value.email);
    if (formUser.value.password) {
      formData.append('password', formUser.value.password);
    }
    if (formUser.value.id) {
      formData.append('id', formUser.value.id.toString());
    }
    formUser.value.role_ids.forEach(id => {
      formData.append('role_ids[]', id.toString());
    });
    
    const response = await saveAction.submit(formData);
    if (response.value?.success) {
      await success(saveTranslations.successTitle, { text: formUser.value.id ? saveTranslations.updatedText : saveTranslations.createdText });
      resetForm();
      navigate(window.location.pathname);
    } else {
      await showError((response.value as any)?.error || 'Failed to save user');
    }
  });

  const handleDelete = $(async (id: string | number) => {
    const user = users.value.find((u: any) => u.id === id);
    if (!user) return;

    const result = await confirm(deleteTranslations.confirmText, { icon: 'warning', title: deleteTranslations.title });
    if (!result.isConfirmed) return;

    const response = await deleteAction.submit({ userId: id.toString() });
    if (response.value?.success) {
      await success(deleteTranslations.successTitle, { text: deleteTranslations.deletedText });
      navigate(window.location.pathname);
    } else {
      await showError((response.value as any)?.message || deleteTranslations.failedText);
    }
  });

  return (
    <>
      {/* Component: UsersPage */}
      <div>
        <PageHeader
          title={t('users.title')}
          description={t('users.subtitle')}
        >
          <div class="flex gap-2">
            {!showForm.value ? (
              <button
                onClick$={() => (showForm.value = true)}
                class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700"
              >
                {t('users.addNew')}
              </button>
            ) : (
              <button
                onClick$={resetForm}
                class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
        </PageHeader>

        {/* Form */}
        {showForm.value && (
          <div class="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-800">
            <h2 class="mb-4 text-lg font-semibold">
              {editingUserId.value ? t('users.edit') : t('users.addNew')}
            </h2>
            <Form action={saveAction} class="space-y-4">
              <input type="hidden" name="id" value={formUser.value.id || ''} />
              <div class="grid gap-4 md:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('users.name')}
                  </label>
                  <input
                    name="name"
                    type="text"
                    value={formUser.value.name}
                    onInput$={(e: any) => (formUser.value.name = e.target.value)}
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {t('users.email')}
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={formUser.value.email}
                    onInput$={(e: any) => (formUser.value.email = e.target.value)}
                    required
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                  />
                </div>
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('users.password')} {editingUserId.value ? t('users.passwordHint') : ''}
                </label>
                <input
                  name="password"
                  type="password"
                  value={formUser.value.password}
                  onInput$={(e: any) => (formUser.value.password = e.target.value)}
                  required={!editingUserId.value}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                />
              </div>
              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t('users.roles')}
                </label>
                <select
                  name="role_ids[]"
                  multiple
                  value={formUser.value.role_ids.map(String)}
                  onChange$={(e: any) => {
                    const selected = Array.from(e.target.selectedOptions, (opt: any) => {
                      const val = Number(opt.value);
                      return isNaN(val) ? 0 : val;
                    }).filter(id => id > 0);
                    formUser.value.role_ids = selected;
                  }}
                  class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary-500 focus:outline-none focus:ring focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:ring-primary-700/40"
                >
                  {roles.value.map((role) => (
                    <option key={role.id} value={String(role.id)}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  onClick$={handleSave}
                  disabled={saveAction.isRunning}
                  class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-50"
                >
                  {editingUserId.value ? t('common.update') : t('common.add')}
                </button>
                <button
                  type="button"
                  onClick$={resetForm}
                  class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </Form>
          </div>
        )}

        {/* Users List */}
        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-800">
          <div class="border-b border-gray-200 p-4 dark:border-gray-700">
            <h2 class="text-lg font-semibold">{t('users.list')}</h2>
          </div>
          {loading.value ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">
              <LoadingSpinner />
            </div>
          ) : users.value.length === 0 ? (
            <div class="py-8 text-center text-gray-500 dark:text-gray-400">{t('users.noUsers')}</div>
          ) : (
            <div class="divide-y divide-gray-200 dark:divide-gray-700">
              {users.value.map((user: any) => (
                <div
                  key={user.id}
                  class="flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 dark:text-gray-100">{user.name}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                    {(user.roles || (user as any).role) && (
                      <div class="mt-2 flex flex-wrap gap-2">
                        {Array.isArray(user.roles) && user.roles.length > 0 ? (
                          user.roles.map((role: any) => (
                            <span
                              key={role.id || role}
                              class="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400"
                            >
                              {role.name || role}
                            </span>
                          ))
                        ) : (user as any).role ? (
                          <span class="rounded-full bg-primary-100 px-2 py-1 text-xs font-medium text-primary-800 dark:bg-primary-900/20 dark:text-primary-400">
                            {(user as any).role}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div class="flex gap-2">
                    <button
                      onClick$={() => editUser(user)}
                      class="rounded-lg px-3 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick$={() => handleDelete(user.id)}
                      class="rounded-lg px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: 'Users - Dashboard',
  meta: [
    {
      name: 'description',
      content: 'Manage system users',
    },
  ],
};
