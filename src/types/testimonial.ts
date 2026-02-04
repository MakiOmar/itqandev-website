/**
 * Testimonial entity types
 */

export interface Testimonial {
  id: number;
  projectId?: number;
  clientName: string;
  clientRole?: string;
  company?: string;
  rating?: number;
  content: string;
  videoUrl?: string;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: number;
    title: string;
  };
}

export interface TestimonialCreateInput {
  projectId?: number;
  clientName: string;
  clientRole?: string;
  company?: string;
  rating?: number;
  content: string;
  videoUrl?: string;
  approved?: boolean;
}

export interface TestimonialUpdateInput extends Partial<TestimonialCreateInput> {
  id: number;
}
