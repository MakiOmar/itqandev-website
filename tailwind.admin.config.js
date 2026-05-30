/**
 * Tailwind scan paths for admin dashboard only (loaded via admin layout).
 */
import { sharedTailwindTheme } from './tailwind.shared.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...sharedTailwindTheme,
  content: [
    './src/routes/[lang]/admin/**/*.{js,ts,tsx}',
    './src/components/admin/**/*.{js,ts,tsx}',
    './src/components/dashboard/**/*.{js,ts,tsx}',
    './src/components/common/**/*.{js,ts,tsx}',
  ],
};
