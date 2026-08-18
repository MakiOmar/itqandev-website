import type { RequestHandler } from '@builder.io/qwik-city';
import { marketingGet } from '../../lib/marketing/api-client';
import { MARKETING_ENDPOINTS } from '../../lib/marketing/endpoints';
import { buildRobotsTxt } from '../../lib/seo/robots-txt';
import { isSearchEngineIndexingEnabled } from '../../lib/seo/search-engine-indexing';

async function fetchAllowIndexing(): Promise<boolean> {
  try {
    const data = await marketingGet<Record<string, unknown>>(MARKETING_ENDPOINTS.siteMeta);
    return isSearchEngineIndexingEnabled(data?.search_engine_indexing);
  } catch {
    return true;
  }
}

export const onGet: RequestHandler = async ({ send }) => {
  const allowIndexing = await fetchAllowIndexing();
  send(
    new Response(buildRobotsTxt(allowIndexing), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    }),
  );
};
