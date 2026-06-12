export type TypographyFace = {
  css_family: string;
  fallback_stack: string;
  google_css_href?: string | null;
  sources: Record<string, string>;
};

export type SiteTypography = {
  mode: 'system' | 'custom';
  ltr: TypographyFace;
  rtl: TypographyFace;
};
