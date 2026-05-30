/**
 * Tailwind scan paths for public marketing site (smaller CSS bundle on homepage).
 */
import { sharedTailwindTheme } from './tailwind.shared.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedTailwindTheme,
  content: [
    './src/root.tsx',
    './src/routes/layout.tsx',
    './src/routes/index.tsx',
    './src/routes/[lang]/layout.tsx',
    './src/routes/[lang]/(public)/**/*.{js,ts,tsx}',
    './src/components/marketing/**/*.{js,ts,tsx}',
    './src/components/common/**/*.{js,ts,tsx}',
    './src/components/router-head/**/*.{js,ts,tsx}',
    './src/components/navigation-indicator/**/*.{js,ts,tsx}',
  ],
};
