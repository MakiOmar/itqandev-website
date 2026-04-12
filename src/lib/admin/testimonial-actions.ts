import { routeAction$, zod$, z } from '@builder.io/qwik-city';
import { getApiClient } from '../api/client';
import { API_ENDPOINTS } from '../api/endpoints';
import type { Testimonial, TestimonialCreateInput, TestimonialUpdateInput } from '../../types';

/**
 * Normalize Laravel (snake_case) or camelCase testimonial JSON for admin UI
 */
export function mapTestimonialFromApi(raw: Record<string, unknown>): Testimonial {
  const projectRaw = raw.project as Record<string, unknown> | undefined | null;
  let project: Testimonial['project'] | undefined;
  if (projectRaw && projectRaw.id != null) {
    project = {
      id: Number(projectRaw.id),
      title: String(projectRaw.title ?? ''),
    };
  }
  const translationsRaw = raw.translations;
  const translations = Array.isArray(translationsRaw)
    ? (translationsRaw as Record<string, unknown>[]).map((tr) => ({
        id: tr.id != null ? Number(tr.id) : undefined,
        locale: String(tr.locale ?? ''),
        content: tr.content != null ? String(tr.content) : null,
        client_role:
          tr.client_role != null
            ? String(tr.client_role)
            : tr.clientRole != null
              ? String(tr.clientRole)
              : null,
        company: tr.company != null ? String(tr.company) : null,
      }))
    : undefined;

  return {
    id: Number(raw.id),
    projectId:
      raw.project_id != null
        ? Number(raw.project_id)
        : raw.projectId != null
          ? Number(raw.projectId)
          : undefined,
    contentLocale: (raw.content_locale ?? raw.contentLocale ?? null) as string | null,
    clientName: String(raw.client_name ?? raw.clientName ?? ''),
    clientRole:
      (raw.client_role ?? raw.clientRole) != null
        ? String(raw.client_role ?? raw.clientRole)
        : undefined,
    company: raw.company != null ? String(raw.company) : undefined,
    rating: raw.rating != null ? Number(raw.rating) : 5,
    content: String(raw.content ?? ''),
    videoUrl:
      raw.video_url != null
        ? String(raw.video_url)
        : raw.videoUrl != null
          ? String(raw.videoUrl)
          : undefined,
    approved: Boolean(raw.approved ?? false),
    createdAt: String(raw.created_at ?? raw.createdAt ?? ''),
    updatedAt: String(raw.updated_at ?? raw.updatedAt ?? ''),
    translations,
    project,
  };
}

/**
 * Zod schema for testimonial create/update forms (snake_case field names)
 */
export const testimonialFormSchema = z.object({
  project_id: z.string().optional(),
  client_name: z.string().min(1, 'Client name is required'),
  client_role: z.string().optional(),
  company: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  content: z.string().min(1, 'Content is required'),
  video_url: z.string().url().optional().or(z.literal('')),
  approved: z.union([z.boolean(), z.string()]).optional(),
});

/**
 * Admin: create testimonial
 */
export const useCreateTestimonial = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: TestimonialCreateInput = {
      projectId: data.project_id ? Number(data.project_id) : undefined,
      clientName: data.client_name,
      clientRole: data.client_role || undefined,
      company: data.company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : data.rating || 5,
      content: data.content,
      videoUrl: data.video_url || undefined,
      approved: data.approved === true || data.approved === '1' || data.approved === 'on',
    };
    const response = await apiClient.post<Testimonial>(API_ENDPOINTS.TESTIMONIALS.CREATE, payload);
    return { success: true, testimonial: response?.data ?? response };
  },
  zod$(testimonialFormSchema),
);

/**
 * Admin: update testimonial
 */
export const useUpdateTestimonial = routeAction$(
  async (data) => {
    const apiClient = getApiClient();
    const payload: TestimonialUpdateInput = {
      id: Number(data.id),
      projectId: data.project_id ? Number(data.project_id) : undefined,
      clientName: data.client_name,
      clientRole: data.client_role || undefined,
      company: data.company || undefined,
      rating: typeof data.rating === 'string' ? Number(data.rating) : data.rating || 5,
      content: data.content,
      videoUrl: data.video_url || undefined,
      approved: data.approved === true || data.approved === '1' || data.approved === 'on',
    };
    await apiClient.put(API_ENDPOINTS.TESTIMONIALS.UPDATE(String(data.id)), payload);
    return { success: true };
  },
  zod$(testimonialFormSchema.extend({ id: z.string() })),
);

/**
 * Admin: delete testimonial
 */
export const useDeleteTestimonial = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.delete(API_ENDPOINTS.TESTIMONIALS.DELETE(data.id as string));
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete testimonial' });
  }
});

/**
 * Admin: bulk delete testimonials
 */
export const useBulkDeleteTestimonials = routeAction$(async (data, { fail }) => {
  try {
    const apiClient = getApiClient();
    await apiClient.post(API_ENDPOINTS.TESTIMONIALS.BULK_DELETE, { ids: data.ids });
    return { success: true };
  } catch (error: any) {
    return fail(500, { message: error.message || 'Failed to delete testimonials' });
  }
});
