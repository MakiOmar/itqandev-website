import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import type { BlogPost } from '../../lib/marketing/types';
import { MARKETING_ROUTES } from '../../lib/marketing/constants';
import { Card } from './Card';

export interface BlogCardProps {
  post: BlogPost;
}

export const BlogCard = component$<BlogCardProps>(({ post }) => {
  const href = MARKETING_ROUTES.blogSlug(post.slug);
  const dateStr = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <Link href={href} class="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl">
      <Card class="h-full flex flex-col transition-shadow hover:shadow-md">
        <time dateTime={post.date} class="text-sm text-slate-500 dark:text-slate-400">
          {dateStr}
        </time>
        <h3 class="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
          {post.title}
        </h3>
        <p class="mt-1 flex-1 text-sm text-slate-600 dark:text-slate-400 line-clamp-3">
          {post.excerpt}
        </p>
        <span class="mt-3 inline-flex items-center text-sm font-medium text-primary-600 dark:text-primary-400">
          Read more
          <svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </Card>
    </Link>
  );
});
