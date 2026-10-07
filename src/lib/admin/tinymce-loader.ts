/**
 * TinyMCE loads only when an admin rich-text field mounts (separate Rollup chunk).
 */

type TinyMceEditor = {
  remove: () => void;
  getContent: () => string;
  setContent: (html: string) => void;
};

type TinyMceApi = {
  init: (config: Record<string, unknown>) => Promise<unknown>;
  get: (id: string) => TinyMceEditor | undefined;
};

const tinymcePlugins = [
  'lists',
  'link',
  'table',
  'image',
  'media',
  'code',
  'directionality',
  'fullscreen',
  'wordcount',
] as const;

function getGlobalTinyMce(): TinyMceApi | undefined {
  return (globalThis as unknown as { tinymce?: TinyMceApi }).tinymce;
}

export async function loadTinyMce(): Promise<TinyMceApi> {
  await import('tinymce/tinymce');
  const tinymce = getGlobalTinyMce();
  if (!tinymce) {
    throw new Error('TinyMCE failed to load');
  }

  await import('tinymce/icons/default');
  await import('tinymce/themes/silver');
  await import('tinymce/models/dom');
  await import('tinymce/plugins/lists');
  await import('tinymce/plugins/link');
  await import('tinymce/plugins/table');
  await import('tinymce/plugins/image');
  await import('tinymce/plugins/media');
  await import('tinymce/plugins/code');
  await import('tinymce/plugins/directionality');
  await import('tinymce/plugins/fullscreen');
  await import('tinymce/plugins/wordcount');

  await loadTinyMceSkin();

  return tinymce;
}

/**
 * Skin is injected as text (skin: false in init). Qwik's Vite plugin adds every emitted CSS asset
 * (plain or `?url` imports) to the global head, so the skin would ship to every admin page.
 * The unminified skin is used because TinyMCE's skin.min.css contains an invalid
 * `:nth-child(2of…)` selector.
 */
async function loadTinyMceSkin(): Promise<void> {
  if (typeof document === 'undefined') return;
  const variant = document.documentElement.classList.contains('dark') ? 'oxide-dark' : 'oxide';
  if (document.querySelector(`style[data-tinymce-skin="${variant}"]`)) return;

  const { default: css } =
    variant === 'oxide-dark'
      ? await import('tinymce/skins/ui/oxide-dark/skin.css?raw')
      : await import('tinymce/skins/ui/oxide/skin.css?raw');

  const style = document.createElement('style');
  style.dataset.tinymceSkin = variant;
  style.textContent = css;
  document.head.appendChild(style);
}

export const TINYMCE_PLUGIN_LIST = tinymcePlugins.join(' ');
