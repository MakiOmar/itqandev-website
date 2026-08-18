import { supportedUiLocaleCodes } from '../i18n/ui-locale-segments';
import { getPublicSiteBaseUrl } from './canonical-url';

const siteBaseUrl = (): string => getPublicSiteBaseUrl().replace(/\/$/, '');

/**
 * robots.txt body: Allow public site; disallow dashboard for every configured UI locale.
 * Regenerated on each request from `speakConfig.supportedLocales` (add a locale there → no manual edits).
 * When `allowIndexing` is false, crawlers are told not to fetch any URL.
 */
export function buildRobotsTxt(allowIndexing = true): string {
  const codes = supportedUiLocaleCodes();
  const adminDisallows = [
    'Disallow: /admin/',
    ...codes.map((code) => `Disallow: /${code}/admin/`),
  ];

  if (!allowIndexing) {
    return [
      'User-agent: *',
      'Disallow: /',
      '',
      '# Operator dashboard — generated from speakConfig.supportedLocales',
      ...adminDisallows,
      '',
    ].join('\n') + '\n';
  }

  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Operator dashboard — generated from speakConfig.supportedLocales',
    ...adminDisallows,
    '',
    `Sitemap: ${siteBaseUrl()}/sitemap.xml`,
  ];
  return `${lines.join('\n')}\n`;
}
