/**
 * This is the base config for vite.
 * When building, the adapter config is used which loads this file and extends it.
 */
import { defineConfig, loadEnv, type UserConfig } from "vite";
import { qwikVite } from "@builder.io/qwik/optimizer";
import { qwikCity } from "@builder.io/qwik-city/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import pkg from "./package.json";

type PkgDep = Record<string, string>;
const { dependencies = {}, devDependencies = {} } = pkg as any as {
  dependencies: PkgDep;
  devDependencies: PkgDep;
  [key: string]: unknown;
};
errorOnDuplicatesPkgDeps(devDependencies, dependencies);

/**
 * Rollup manual chunk names for node_modules (client build only).
 * Keeps TinyMCE (~1.4MB) off the default route chunks.
 */
function manualVendorChunk(id: string): string | undefined {
  if (!id.includes("node_modules")) {
    return undefined;
  }
  if (id.includes("tinymce")) {
    return "tinymce";
  }
  if (id.includes("sweetalert2")) {
    return "sweetalert2";
  }
  if (id.includes("@qwik-ui")) {
    return "qwik-ui";
  }
  if (id.includes("qwik-speak")) {
    return "qwik-speak";
  }
  if (id.includes("@qwikest/icons")) {
    return "icons";
  }
  if (id.includes("zod")) {
    return "zod";
  }
  if (id.includes("@builder.io/qwik-city")) {
    return "qwik-city";
  }
  if (id.includes("@builder.io/qwik")) {
    return "qwik-core";
  }
  return "vendor";
}

/**
 * Note that Vite normally starts from `index.html` but the qwikCity plugin makes start at `src/entry.ssr.tsx` instead.
 */
export default defineConfig(({ command, mode }): UserConfig => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET || "http://127.0.0.1").replace(/\/$/, "");
  /** Shared proxy for dev server and preview — browser /api and /storage → Laravel. */
  const laravelDevProxy = {
    "/api": {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: false,
    },
    "/sanctum": {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: false,
    },
    "/storage": {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: false,
    },
  };
  // SSR builds use --ssr flag or have entry.preview/entry.ssr, so we check mode and command
  const isClientBuild = command === 'build' && mode === 'production' && !process.argv.includes('--ssr');
  
  return {
    plugins: [qwikCity(), qwikVite(), tsconfigPaths({ root: "." })],
    // Optimize CSS - Static generation with Vite + Tailwind v4
    css: {
      devSourcemap: false,
      // PostCSS processes Tailwind through @tailwindcss/postcss
      // Vite then minifies and optimizes the output
      postcss: './postcss.config.js',
    },
    // This tells Vite which dependencies to pre-build in dev mode.
    optimizeDeps: {
      // Put problematic deps that break bundling here, mostly those with binaries.
      // For example ['better-sqlite3'] if you use that in server functions.
      exclude: [],
    },
    build: {
      // CSS is statically generated at build time by Tailwind v4 + PostCSS
      // Vite then minifies and optimizes it
      cssCodeSplit: true, // Split CSS for better caching
      // cssMinify: 'lightningcss', // Requires @lightningcss/cli - using default esbuild for now
      minify: 'esbuild',
      // Only apply manual chunks for client builds, not SSR/preview
      // For SSR builds, use inlineDynamicImports to avoid circular dependencies
      rollupOptions: isClientBuild ? {
        output: {
          manualChunks: manualVendorChunk,
        },
      } : {
        // For SSR/preview builds, use inlineDynamicImports to prevent circular dependencies
        output: {
          inlineDynamicImports: true,
        },
      },
      // TinyMCE (~1.3MB) is a single lazy chunk (q-*); only fetched when rich-text editor mounts.
      chunkSizeWarningLimit: 1400,
    },

    /**
     * This is an advanced setting. It improves the bundling of your server code. To use it, make sure you understand when your consumed packages are dependencies or dev dependencies. (otherwise things will break in production)
     */
    // ssr:
    //   command === "build" && mode === "production"
    //     ? {
    //         // All dev dependencies should be bundled in the server build
    //         noExternal: Object.keys(devDependencies),
    //         // Anything marked as a dependency will not be bundled
    //         // These should only be production binary deps (including deps of deps), CLI deps, and their module graph
    //         // If a dep-of-dep needs to be external, add it here
    //         // For example, if something uses `bcrypt` but you don't have it as a dep, you can write
    //         // external: [...Object.keys(dependencies), 'bcrypt']
    //         external: Object.keys(dependencies),
    //       }
    //     : undefined,

    server: {
      /** Bind beyond loopback so a hosts-file vhost (e.g. itqandev.com → 127.0.0.1) can open :5173. */
      host: true,
      headers: {
        // Don't cache the server response in dev mode
        "Cache-Control": "public, max-age=0",
      },
      /**
       * Proxy /api, /sanctum, and /storage to Laravel during dev when VITE_API_BASE_URL=/api.
       */
      proxy: laravelDevProxy,
    },
    preview: {
      headers: {
        // Long-lived caching for fingerprinted static assets in preview.
        // Route handlers can still override this for HTML/doc responses.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      /** Same as dev — preview (:4173) has no Laravel static files without this. */
      proxy: laravelDevProxy,
    },
  };
});

// *** utils ***

/**
 * Function to identify duplicate dependencies and throw an error
 * @param {Object} devDependencies - List of development dependencies
 * @param {Object} dependencies - List of production dependencies
 */
function errorOnDuplicatesPkgDeps(
  devDependencies: PkgDep,
  dependencies: PkgDep,
) {
  let msg = "";
  // Create an array 'duplicateDeps' by filtering devDependencies.
  // If a dependency also exists in dependencies, it is considered a duplicate.
  const duplicateDeps = Object.keys(devDependencies).filter(
    (dep) => dependencies[dep],
  );

  // include any known qwik core packages (but allow UI packages in dependencies)
  const qwikCorePkg = Object.keys(dependencies).filter((value) =>
    /^@builder\.io\/(qwik|qwik-city)$/.test(value),
  );

  // any errors for missing "qwik-city-plan"
  // [PLUGIN_ERROR]: Invalid module "@qwik-city-plan" is not a valid package
  // Note: UI packages like @qwik-ui/* and qwik-speak are allowed in dependencies
  msg = `Move qwik core packages ${qwikCorePkg.join(", ")} to devDependencies`;

  if (qwikCorePkg.length > 0) {
    throw new Error(msg);
  }

  // Format the error message with the duplicates list.
  // The `join` function is used to represent the elements of the 'duplicateDeps' array as a comma-separated string.
  msg = `
    Warning: The dependency "${duplicateDeps.join(", ")}" is listed in both "devDependencies" and "dependencies".
    Please move the duplicated dependencies to "devDependencies" only and remove it from "dependencies"
  `;

  // Throw an error with the constructed message.
  if (duplicateDeps.length > 0) {
    throw new Error(msg);
  }
}
