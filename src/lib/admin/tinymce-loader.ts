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
  await import('tinymce/plugins/fullscreen');
  await import('tinymce/plugins/wordcount');

  return tinymce;
}

export const TINYMCE_PLUGIN_LIST = tinymcePlugins.join(' ');
