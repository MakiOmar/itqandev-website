import type { RequestHandler } from '@builder.io/qwik-city';
import { buildRobotsTxt } from '../../lib/seo/robots-txt';

export const onGet: RequestHandler = async ({ send }) => {
  send(
    new Response(buildRobotsTxt(), {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    }),
  );
};
