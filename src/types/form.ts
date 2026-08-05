export type FormFieldSpan = {
  mobile: number;
  tablet: number;
  desktop: number;
};

export type FormFieldNode = {
  id: string;
  type: string;
  span: FormFieldSpan;
  settings: Record<string, unknown>;
};

export type FormRowNode = {
  id: string;
  fields: FormFieldNode[];
};

export type FormLayoutDocument = {
  rows: FormRowNode[];
};

export type FormActionNode = {
  id: string;
  type: string;
  enabled: boolean;
  settings: Record<string, unknown>;
};

export type FormSettings = {
  submit_label?: string;
  success_message?: string;
  error_message?: string;
  success_mode?: 'message' | 'redirect';
  honeypot?: boolean;
  captcha?: 'none' | 'turnstile' | 'recaptcha_v2' | 'recaptcha_v3';
  store_ip?: boolean;
  translations?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
};

export type AdminForm = {
  id: number;
  title: string;
  slug: string;
  status: string;
  content_locale: string | null;
  published_at: string | null;
  layout: FormLayoutDocument | Record<string, unknown>;
  actions: FormActionNode[];
  settings: FormSettings;
  translations: Array<{ locale: string; title?: string | null }>;
  submissions_count?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type FormFieldRegistryEntry = {
  type: string;
  label: string;
  max_instances: number | null;
  default_settings: Record<string, unknown>;
  settings_fields: Array<{
    key: string;
    type: string;
    label: string;
    translatable?: boolean;
    min?: number;
    max?: number;
  }>;
};

export type FormActionRegistryEntry = {
  type: string;
  label: string;
  default_enabled: boolean;
  default_settings: Record<string, unknown>;
  settings_fields: FormFieldRegistryEntry['settings_fields'];
};

export type PublicFormDefinition = {
  id: number;
  title: string;
  slug: string;
  layout: FormLayoutDocument;
  settings: FormSettings;
  captcha?: { provider: string; site_key?: string | null };
};
