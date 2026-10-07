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
 * Skin is linked as a separate hashed asset (skin: false in init). A plain CSS import gets merged
 * into the shared admin stylesheet and ships to every admin page. The unminified skin is used
 * because TinyMCE's skin.min.css contains an invalid `:nth-child(2of…)` selector.
 */
async function loadTinyMceSkin(): Promise<void> {
  if (typeof document === 'undefined') return;
  const isDark = document.documentElement.classList.contains('dark');
  const { default: href } = isDark
    ? await import('tinymce/skins/ui/oxide-dark/skin.css?url')
    : await import('tinymce/skins/ui/oxide/skin.css?url');

  if (document.querySelector(`link[data-tinymce-skin][href="${href}"]`)) return;

  await new Promise<void>((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.tinymceSkin = '';
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export const TINYMCE_PLUGIN_LIST = tinymcePlugins.join(' ');
