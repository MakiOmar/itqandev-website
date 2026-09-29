import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';
import builderCanvasContainerQueries from './postcss/builder-canvas-container-queries.js';

export default {
  plugins: [
    // Flattened output (rules inside @media) is required by the builder canvas plugin; Vite minifies.
    tailwindcss({ optimize: { minify: false } }),
    builderCanvasContainerQueries(),
    autoprefixer,
  ],
};
