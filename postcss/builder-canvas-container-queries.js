/**
 * Page builder canvas renders the public page inside the admin at a device width
 * (390px / 820px) while the browser viewport stays wide. Tailwind `md:` / `lg:` are
 * viewport media queries, so without this the canvas shows desktop layout squeezed.
 *
 * For every width-only `@media` block this plugin excludes descendants of
 * `[data-builder-canvas]` from the original rules and, in `full` mode (admin.css and
 * builder widget styles), appends an equivalent `@container builder-canvas (...)` copy
 * scoped to them. On public pages the added selectors never match.
 *
 * Requires flattened CSS (Tailwind `optimize`), i.e. rules nested in `@media`, not the reverse.
 */
import postcss from 'postcss';

export const BUILDER_CANVAS_ATTR = '[data-builder-canvas]';
export const BUILDER_CANVAS_CONTAINER = 'builder-canvas';

const WIDTH_FEATURE = String.raw`\(\s*(?:min-|max-)?width\s*(?::|[<>]=?)\s*[^()]+\)`;
const WIDTH_ONLY_QUERY = new RegExp(`^\\s*${WIDTH_FEATURE}(?:\\s+and\\s+${WIDTH_FEATURE})*\\s*$`, 'i');

const EXCLUDE = `:where(:not(${BUILDER_CANVAS_ATTR} *))`;

export function isWidthOnlyQuery(params) {
  return WIDTH_ONLY_QUERY.test(params);
}

/** Index of the first top-level unescaped `::` (pseudo-element), or -1. */
function pseudoElementIndex(selector) {
  let depth = 0;
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    else if (depth === 0 && ch === ':' && selector[i + 1] === ':') return i;
  }
  return -1;
}

export function excludeCanvasSelector(selector) {
  const idx = pseudoElementIndex(selector);
  return idx === -1 ? `${selector}${EXCLUDE}` : `${selector.slice(0, idx)}${EXCLUDE}${selector.slice(idx)}`;
}

export function scopeToCanvasSelector(selector) {
  return `:where(${BUILDER_CANVAS_ATTR}) ${selector}`;
}

function insideKeyframes(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === 'atrule' && /keyframes$/i.test(p.name)) return true;
  }
  return false;
}

function mapRuleSelectors(parent, mapSelector) {
  parent.walkRules((rule) => {
    if (!insideKeyframes(rule)) rule.selectors = rule.selectors.map(mapSelector);
  });
}

/**
 * `full`: exclude canvas from media rules and add container copies.
 * `exclude`: only exclude (site.css can share the admin document in dev; admin.css supplies the copies).
 * @param {string} file
 * @returns {'full' | 'exclude' | false}
 */
export function defaultCanvasMode(file) {
  if (/[\\/](styles[\\/]admin|marketing[\\/]builder-widget-styles|marketing[\\/]widgets[\\/][\w-]+)\.css(\?.*)?$/.test(file)) return 'full';
  if (/[\\/]styles[\\/]site\.css$/.test(file)) return 'exclude';
  return false;
}

/**
 * @param {{ mode?: (file: string) => 'full' | 'exclude' | false }} [opts]
 */
export default function builderCanvasContainerQueries(opts = {}) {
  const modeFor = opts.mode ?? defaultCanvasMode;
  return {
    postcssPlugin: 'builder-canvas-container-queries',
    OnceExit(root) {
      const mode = modeFor(root.source?.input?.file ?? '');      if (!mode) return;
      root.walkAtRules('media', (media) => {
        if (!isWidthOnlyQuery(media.params)) return;
        if (mode === 'full') {
          const container = postcss.atRule({
            name: 'container',
            params: `${BUILDER_CANVAS_CONTAINER} ${media.params.trim()}`,
            nodes: media.nodes.map((n) => n.clone()),
          });
          mapRuleSelectors(container, scopeToCanvasSelector);
          media.after(container);
        }
        mapRuleSelectors(media, excludeCanvasSelector);
      });
    },
  };
}
builderCanvasContainerQueries.postcss = true;
