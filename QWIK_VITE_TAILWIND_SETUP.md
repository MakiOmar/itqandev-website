# Vite + Tailwind CSS Configuration for Qwik Framework

This guide explains how to configure Vite and Tailwind CSS in a Qwik project to match the same setup used in this Nuxt.js project.

## Prerequisites

- Node.js 18+ installed
- Basic understanding of Qwik framework

## Step 1: Create a Qwik Project

```bash
npm create qwik@latest my-qwik-app
cd my-qwik-app
npm install
```

## Step 2: Install Tailwind CSS and Dependencies

```bash
npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms @tailwindcss/typography
```

## Step 3: Initialize Tailwind CSS

```bash
npx tailwindcss init -p
```

This creates `tailwind.config.js` and `postcss.config.js` files.

## Step 4: Configure Tailwind CSS

Edit `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/routes/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Arial', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      screens: {
        'xs': '475px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

## Step 5: Configure PostCSS

Edit `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

## Step 6: Create Main CSS File

Create `src/global.css` (or `src/global.scss` if using SCSS):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased;
  }
  
  [dir="rtl"] {
    direction: rtl;
  }
  
  [dir="ltr"] {
    direction: ltr;
  }
}

@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors duration-200;
  }
  
  .btn-primary {
    @apply bg-blue-600 text-white hover:bg-blue-700;
  }
  
  .btn-secondary {
    @apply bg-gray-200 text-gray-800 hover:bg-gray-300;
  }
  
  .btn-outline {
    @apply border-2 border-gray-300 text-gray-700 hover:bg-gray-50;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-md overflow-hidden;
  }
  
  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
  
  .form-input {
    @apply w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  }
  
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  
  .badge-primary {
    @apply bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200;
  }
  
  .badge-secondary {
    @apply bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200;
  }
}
```

## Step 7: Import CSS in Root Component

In Qwik, import the CSS file in your root component. Edit `src/root.tsx`:

```tsx
import { component$, Slot } from '@builder.io/qwik';
import { routeLoader$ } from '@builder.io/qwik-city';
import { QwikCity, QwikCityProvider, QwikSpeakProvider } from '@builder.io/qwik-city';
import { QwikQL } from '@builder.io/qwik-city';
import { isDev } from '@builder.io/qwik/build';
import { config } from './speak-config';
import { translationFn } from './speak-functions';
import './global.css'; // Import Tailwind CSS

export const useServerTimeLoader = routeLoader$(() => {
  return {
    date: new Date().toISOString(),
  };
});

export default component$(() => {
  return (
    <QwikCity>
      <head>
        <meta charSet="utf-8" />
        <link rel="manifest" href="/manifest.json" />
        <QwikSpeakProvider config={config} translationFn={translationFn}>
          <Slot />
        </QwikSpeakProvider>
      </head>
      <body lang="en">
        <Slot />
      </body>
    </QwikCity>
  );
});
```

## Step 8: Configure Vite (Optional Customization)

Qwik uses Vite by default. If you need to customize Vite settings, create or edit `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { qwikCity } from '@builder.io/qwik-city/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    plugins: [
      qwikCity(),
      qwikVite(),
      tsconfigPaths(),
    ],
    build: {
      minify: 'esbuild',
      cssMinify: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['@builder.io/qwik', '@builder.io/qwik-city'],
          },
        },
      },
    },
    css: {
      postcss: './postcss.config.js',
    },
    optimizeDeps: {
      include: ['@builder.io/qwik'],
    },
  };
});
```

## Step 9: Install Additional Dependencies (if needed)

```bash
npm install -D vite-tsconfig-paths
```

## Step 10: Verify Configuration

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Test Tailwind classes in a component:**
   ```tsx
   // src/routes/index.tsx
   import { component$ } from '@builder.io/qwik';

   export default component$(() => {
     return (
       <div class="container mx-auto px-4 py-8">
         <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
           Hello Qwik + Tailwind!
         </h1>
         <button class="btn btn-primary mt-4">
           Click Me
         </button>
       </div>
     );
   });
   ```

3. **Test dark mode:**
   Add a dark mode toggle to test class-based dark mode:
   ```tsx
   import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

   export default component$(() => {
     const isDark = useSignal(false);

     useVisibleTask$(() => {
       // Check localStorage or system preference
       const stored = localStorage.getItem('darkMode');
       isDark.value = stored === 'true' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
       document.documentElement.classList.toggle('dark', isDark.value);
     });

     return (
       <button
         onClick$={() => {
           isDark.value = !isDark.value;
           document.documentElement.classList.toggle('dark', isDark.value);
           localStorage.setItem('darkMode', String(isDark.value));
         }}
         class="btn btn-secondary"
       >
         {isDark.value ? 'Light Mode' : 'Dark Mode'}
       </button>
     );
   });
   ```

## Key Differences from Nuxt.js

1. **No Nuxt Module**: Qwik doesn't have a `@qwikjs/tailwindcss` module, so you configure Tailwind manually.

2. **CSS Import**: In Qwik, you import CSS directly in the root component or entry file, not via a config file.

3. **Content Paths**: Qwik uses `.tsx` files instead of `.vue`, so update the `content` array in `tailwind.config.js` accordingly.

4. **Vite Config**: Qwik's Vite config is in `vite.config.ts` and uses Qwik-specific plugins (`qwikVite`, `qwikCity`).

5. **No SSR Module**: Qwik handles SSR differently than Nuxt, but Tailwind works the same way.

## Troubleshooting

### Tailwind classes not working

1. **Check content paths**: Ensure `tailwind.config.js` `content` array includes all your component files.
2. **Verify CSS import**: Make sure `global.css` is imported in your root component.
3. **Clear cache**: Delete `.qwik` folder and restart dev server.

### Dark mode not working

1. **Check darkMode setting**: Ensure `darkMode: 'class'` is set in `tailwind.config.js`.
2. **Verify class toggle**: Make sure `dark` class is added to `<html>` or root element.

### Build errors

1. **Check PostCSS config**: Ensure `postcss.config.js` is properly configured.
2. **Verify dependencies**: Run `npm install` to ensure all packages are installed.
3. **Check Vite version**: Qwik requires specific Vite versions, check compatibility.

## Additional Resources

- [Qwik Documentation](https://qwik.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)
- [Qwik + Tailwind Example](https://github.com/BuilderIO/qwik/tree/main/packages/qwik-city/examples/tailwind)

## Package.json Scripts

Your `package.json` should include:

```json
{
  "scripts": {
    "build": "qwik build",
    "dev": "vite --mode ssr",
    "preview": "vite preview",
    "start": "node server/entry.express"
  }
}
```

## Summary

The main steps to replicate the Nuxt.js Vite + Tailwind setup in Qwik are:

1. ✅ Install Tailwind CSS and plugins
2. ✅ Configure `tailwind.config.js` with content paths and theme
3. ✅ Configure `postcss.config.js`
4. ✅ Create `global.css` with Tailwind directives and custom components
5. ✅ Import CSS in root component
6. ✅ Configure Vite (optional, Qwik handles most of it)
7. ✅ Test with sample components

The configuration is very similar, with the main difference being that Qwik requires manual setup instead of using a Nuxt module.
