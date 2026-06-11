import { supportedUiLocaleCodes } from '../i18n/ui-locale-segments';
import { getPublicSiteBaseUrl } from './canonical-url';

const siteBaseUrl = (): string => getPublicSiteBaseUrl().replace(/\/$/, '');

/**
 * robots.txt body: Allow public site; disallow dashboard for every configured UI locale.
 * Regenerated on each request from `speakConfig.supportedLocales` (add a locale there → no manual edits).
 */
export function buildRobotsTxt(): string {
  const codes = supportedUiLocaleCodes();
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Operator dashboard — generated from speakConfig.supportedLocales',
    'Disallow: /admin/',
    ...codes.map((code) => `Disallow: /${code}/admin/`),
    '',
    `Sitemap: ${siteBaseUrl()}/sitemap.xml`,
  ];
  return `${lines.join('\n')}\n`;
}
