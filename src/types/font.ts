export interface SiteFont {
  id: number;
  name: string;
  css_family: string;
  file_woff2?: string | null;
  file_woff?: string | null;
  file_ttf?: string | null;
  file_eot?: string | null;
  file_svg?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type FontFileFormat = 'woff2' | 'woff' | 'ttf' | 'eot' | 'svg';

export const FONT_FILE_FORMATS: FontFileFormat[] = ['woff2', 'woff', 'ttf', 'eot', 'svg'];

export type FontFormData = {
  name: string;
  css_family: string;
  file_woff2: string;
  file_woff: string;
  file_ttf: string;
  file_eot: string;
  file_svg: string;
};

export function emptyFontForm(): FontFormData {
  return {
    name: '',
    css_family: '',
    file_woff2: '',
    file_woff: '',
    file_ttf: '',
    file_eot: '',
    file_svg: '',
  };
}

export function fontFormFromRecord(font: SiteFont): FontFormData {
  return {
    name: font.name ?? '',
    css_family: font.css_family ?? '',
    file_woff2: font.file_woff2 ?? '',
    file_woff: font.file_woff ?? '',
    file_ttf: font.file_ttf ?? '',
    file_eot: font.file_eot ?? '',
    file_svg: font.file_svg ?? '',
  };
}

export function presentFontFormats(font: SiteFont | FontFormData): FontFileFormat[] {
  return FONT_FILE_FORMATS.filter((fmt) => {
    const key = `file_${fmt}` as keyof FontFormData;
    const val = String(font[key] ?? '').trim();
    return val.length > 0;
  });
}
