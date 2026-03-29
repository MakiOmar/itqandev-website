import { component$ } from '@builder.io/qwik';
import { Link } from '@builder.io/qwik-city';
import type { BlogPost } from '../../lib/marketing/types';
import { MARKETING_ROUTES } from '../../lib/marketing/constants';
import { Card } from './Card';
import { ContentImage } from './ContentImage';

export interface BlogCardProps {
  post: BlogPost;
}

export const BlogCard = component$<BlogCardProps>(({ post }) => {
  const href = MARKETING_ROUTES.blogSlug(post.slug);
  const dateStr = post.date ? new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <Link href={href} class="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl">
      <Card
        padding="none"
        class="h-full flex flex-col overflow-hidden transition-shadow hover:shadow-md"
      >
        {post.coverImage !== undefined && (
          <div class="aspect-[2/1] w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
            <ContentImage
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              width={640}
              height={320}
              loading="lazy"
              class="h-full w-full object-cover"
            />
          </div>
        )}
        <div class="flex flex-1 flex-col p-6">
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
        </div>
      </Card>
    </Link>
  );
});
