import type { FAQItem, PricingTier, SiteContent } from '../../lib/marketing/types';

/** Operator-managed marketing blocks (no services — those come from the services API). */
export type MarketingSiteContentSettings = Pick<
  SiteContent,
  'pricingTiers' | 'faq' | 'contact' | 'about' | 'techStack'
>;

export function emptyMarketingSiteContent(): MarketingSiteContentSettings {
  return {
    pricingTiers: [],
    faq: [],
    contact: { socials: [] },
    about: { tagline: '', mission: '', values: [] },
    techStack: [],
  };
}

export function parseMarketingSiteContent(raw: unknown): MarketingSiteContentSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return emptyMarketingSiteContent();
  }
  const o = raw as Record<string, unknown>;
  const aboutRaw = o.about;
  const contactRaw = o.contact;

  const aboutObj =
    aboutRaw && typeof aboutRaw === 'object' && !Array.isArray(aboutRaw)
      ? (aboutRaw as Record<string, unknown>)
      : null;
  const about = {
    tagline: typeof aboutObj?.tagline === 'string' ? aboutObj.tagline : '',
    mission: typeof aboutObj?.mission === 'string' ? aboutObj.mission : '',
    values: Array.isArray(aboutObj?.values)
      ? (aboutObj.values as unknown[]).map((v) => String(v)).filter(Boolean)
      : [],
  };

  const contactObj =
    contactRaw && typeof contactRaw === 'object' && !Array.isArray(contactRaw)
      ? (contactRaw as Record<string, unknown>)
      : null;
  const contact = {
    address: typeof contactObj?.address === 'string' ? contactObj.address : '',
    socials: Array.isArray(contactObj?.socials)
      ? (contactObj.socials as unknown[])
          .filter((s) => s && typeof s === 'object')
          .map((s) => {
            const row = s as Record<string, unknown>;
            return {
              name: String(row.name ?? ''),
              url: String(row.url ?? ''),
              icon: typeof row.icon === 'string' ? row.icon : undefined,
            };
          })
      : [],
  };

  return {
    pricingTiers: Array.isArray(o.pricingTiers)
      ? (o.pricingTiers as PricingTier[])
      : Array.isArray(o.pricing_tiers)
        ? (o.pricing_tiers as PricingTier[])
        : [],
    faq: Array.isArray(o.faq) ? (o.faq as FAQItem[]) : [],
    contact,
    about,
    techStack: Array.isArray(o.techStack)
      ? (o.techStack as string[])
      : Array.isArray(o.tech_stack)
        ? (o.tech_stack as string[])
        : [],
  };
}

export function serializeMarketingSiteContent(content: MarketingSiteContentSettings): string {
  return JSON.stringify(content);
}
