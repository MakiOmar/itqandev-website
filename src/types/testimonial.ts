/**
 * Testimonial entity types
 */

export interface TestimonialTranslationRow {
  id?: number;
  locale: string;
  content?: string | null;
  client_role?: string | null;
  company?: string | null;
}

export interface Testimonial {
  id: number;
  projectId?: number;
  contentLocale?: string | null;
  clientName: string;
  clientRole?: string;
  company?: string;
  rating?: number;
  content: string;
  videoUrl?: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  translations?: TestimonialTranslationRow[];
  project?: {
    id: number;
    title: string;
  };
}

export interface TestimonialCreateInput {
  projectId?: number;
  contentLocale?: string | null;
  clientName: string;
  clientRole?: string;
  company?: string;
  rating?: number;
  content: string;
  videoUrl?: string;
  approved?: boolean;
  translations?: Array<{
    locale: string;
    content?: string;
    client_role?: string;
    company?: string;
  }>;
}

export interface TestimonialUpdateInput extends Partial<TestimonialCreateInput> {
  id: number;
}
