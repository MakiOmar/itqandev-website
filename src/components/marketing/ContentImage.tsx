import { component$, useSignal, type QwikIntrinsicElements } from '@builder.io/qwik';
import { marketingPlaceholderAbsoluteUrl, resolveContentImageUrl } from '~/lib/marketing/content-image';

export type ContentImageProps = {
  src?: string | null;
  alt: string;
  class?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
} & Pick<QwikIntrinsicElements['img'], 'sizes'>;

/**
 * Marketing image with `/placeholder.webp` when src is missing, and one-shot fallback if the URL 404s.
 */
export const ContentImage = component$((props: ContentImageProps) => {
  const { src, alt, class: className, width, height, loading, fetchPriority, sizes } = props;
  const url = useSignal(resolveContentImageUrl(src));
  const failedOnce = useSignal(false);

  return (
    <img
      src={url.value}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      class={className}
      decoding="async"
      onError$={() => {
        if (!failedOnce.value) {
          failedOnce.value = true;
          url.value = marketingPlaceholderAbsoluteUrl();
        }
      }}
    />
  );
});
