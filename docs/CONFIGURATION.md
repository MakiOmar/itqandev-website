# Configuration Reference

Complete reference for all configuration options in Qwik Dashboard.

**Backend Laravel env, API settings, feature flags, and ops:** see the repo root **[docs/CONFIGURATION.md](../../docs/CONFIGURATION.md)**.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Configuration File](#configuration-file)
3. [Configuration Options](#configuration-options)
4. [Override Examples](#override-examples)

---

## Environment Variables

All configuration can be set via environment variables in `.env`:

### API Configuration

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_LARAVEL_SANCTUM=true
VITE_CSRF_TOKEN_ENABLED=true
VITE_API_TIMEOUT=30000
```

### Route Configuration

```env
VITE_DASHBOARD_PREFIX=/admin
VITE_ADMIN_LOGIN=/admin/login
VITE_ADMIN_HOME=/admin
VITE_PUBLIC_PREFIX=
VITE_PUBLIC_LOGIN=/login
VITE_PUBLIC_HOME=/
```

### Authentication Configuration

```env
VITE_AUTH_PROVIDER=laravel
VITE_AUTH_COOKIE_NAME=laravel_session
VITE_AUTH_TOKEN_HEADER=Authorization
VITE_AUTH_REFRESH_TOKEN=false
VITE_AUTH_STORAGE=cookie
```

**Behavior:** the dashboard is aligned with the Laravel API’s **Bearer token** from `POST /api/auth/login`. `GET /api/me` must return `user.permissions` (Spatie) so the sidebar can show modules the user is allowed to manage. Cookie-only SPA mode remains documented in [LARAVEL_INTEGRATION.md](./LARAVEL_INTEGRATION.md) if you add Sanctum stateful middleware on the server.

**Marketing site — draft `/work/{slug}` preview:** requests from `website/` to Laravel `GET /api/public/projects/{slug}` use **`credentials: 'include'`** in the browser and forward **`Cookie`** / **`Authorization`** from the document request during SSR loaders. SSR also sends **`Origin` / `Referer`** so Laravel Sanctum treats the hop as stateful. When the browser uses **one hostname** for both Qwik (e.g. `:5173`) and Laravel (default port), cookies are shared; **SSR can preview drafts** without the client retry path. Add **both** that hostname and **`hostname:5173`** (your Vite port) to **`SANCTUM_STATEFUL_DOMAINS`** — Sanctum compares the full `host:port` from `Origin` / `Referer` (e.g. `itqandev.com/*` does **not** match `itqandev.com:5173/...`).

If the HTML URL and API URL differ by **hostname or scheme** (**localhost** vs a vhost name counts even when both resolve to `127.0.0.1`), SSR cannot replay the Laravel session cookie; **`/work/{slug}`** falls back to a **browser retry** with `credentials: 'include'`. Prefer one canonical hostname everywhere (hosts file → same name for site + API) or use **Bearer tokens** stored for the dashboard.

**Dev server:** Qwik **`vite.config.ts`** sets **`server.host: true`** so you can open **`http://your-vhost.example:5173`** (hosts-file name) instead of loopback-only.

**`www` vs apex:** if the hostname in the browser does not match an entry in **`SANCTUM_STATEFUL_DOMAINS`**, set **`VITE_SITE_URL`** to an origin **that is** listed, or add apex + **`www`** (or a pattern Laravel **`Str::is`** accepts, e.g. **`*.example.com`**) there. **`VITE_SITE_URL`** controls optional SSR **`Origin` / `Referer`** normalization while preserving the path from `request.url`.

**Marketing API behavior in dev:** use `VITE_API_PROXY_TARGET` as the single proxy origin for `/api` and `/sanctum`. The **browser** uses the page origin + `/api` (Vite proxy). **Node SSR** calls `VITE_API_PROXY_TARGET` + `/api` directly (not the Vite dev server — fetching `:5173/api` from SSR stalls). Optional `VITE_SSR_API_BASE_URL` overrides the SSR base. Diagnostics: `/{lang}/api-check` and `GET /api/public/ping` (`server_ms`). `VITE_API_PROXY_HOST` and `VITE_DEV_SSR_SKIP_MARKETING_API` are not used.

### Branding Configuration

```env
VITE_APP_NAME=Dashboard
VITE_APP_LOGO=/logo.png
VITE_APP_FAVICON=/favicon.ico
VITE_PRIMARY_COLOR=#0284c7
VITE_SECONDARY_COLOR=#64748b
```

### Features Configuration

```env
VITE_FEATURE_I18N=false
VITE_FEATURE_DARK_MODE=true
VITE_FEATURE_NOTIFICATIONS=true
VITE_FEATURE_ACTIVITY_LOGS=true
VITE_FEATURE_SYSTEM_HEALTH=true
```

### Adding a UI language (dynamic URLs, robots, admin noindex)

UI route prefixes (`/en/`, `/ar/`, `/fr/`, …), dashboard `robots.txt` disallow rules, and admin search blocking are driven by **`UI_LOCALE_DEFINITIONS`** in `website/src/lib/i18n/config.ts` (see `ui-locale-segments.ts`).

1. Add a row to `UI_LOCALE_DEFINITIONS` (e.g. `{ lang: 'fr', currency: '…', timeZone: '…', rtl: false }`).
2. Add `website/src/i18n/fr.json` for qwik-speak UI strings.
3. Redeploy — `GET /robots.txt` picks up the new `Disallow: /fr/admin/` automatically.

For **content** translations (API `X-Content-Locale`), also enable the language in admin **Settings → Languages** (`site_languages` in `project-settings.json`). That is separate from the URL/UI list above.

---

## Configuration File

### Programmatic Configuration

```typescript
import { initConfig } from './lib/config';
import type { ConfigOverride } from './lib/config';

const customConfig: ConfigOverride = {
  api: {
    baseUrl: 'https://api.example.com/api',
    sanctum: true,
  },
  branding: {
    name: 'My App',
    logo: '/custom-logo.png',
  },
};

// Initialize with custom config
initConfig(customConfig, true); // true = use Laravel defaults
```

### Runtime Configuration Update

```typescript
import { updateConfig } from './lib/config';

updateConfig({
  branding: {
    name: 'Updated Name',
  },
});
```

---

## Configuration Options

### `api: ApiConfig`

```typescript
{
  baseUrl: string;           // API base URL
  sanctum?: boolean;         // Enable Laravel Sanctum
  csrfToken?: string;        // CSRF token (auto-fetched if not provided)
  timeout?: number;          // Request timeout in ms
  headers?: Record<string, string>; // Custom headers
}
```

### `routes: { admin: RouteConfig, public: RouteConfig }`

```typescript
{
  admin: {
    prefix: string;          // Admin route prefix (e.g., '/admin')
    login: string;           // Admin login route
    home: string;            // Admin home route
    [key: string]: string;   // Additional custom routes
  },
  public: {
    prefix: string;          // Public route prefix (usually '')
    login: string;           // Public login route
    home: string;            // Public home route
  }
}
```

### `auth: AuthConfig`

```typescript
{
  provider: 'laravel' | 'mock' | 'custom';
  cookieName: string;        // Cookie name for session
  tokenHeader: string;       // Header name for token auth
  refreshToken?: boolean;    // Enable token refresh
  sessionStorage?: 'cookie' | 'localStorage' | 'sessionStorage';
}
```

### `branding: BrandingConfig`

```typescript
{
  name: string;              // Application name
  logo?: string;             // Logo URL/path
  favicon?: string;          // Favicon URL/path
  primaryColor?: string;     // Primary color (hex)
  secondaryColor?: string;   // Secondary color (hex)
}
```

### `features: FeaturesConfig`

```typescript
{
  i18n: boolean;             // Enable internationalization
  darkMode: boolean;          // Enable dark mode
  notifications: boolean;     // Enable notifications
  activityLogs: boolean;      // Enable activity logs
  systemHealth: boolean;      // Enable system health page
}
```

---

## Override Examples

### Example 1: Laravel Integration

```typescript
import { initConfig } from './lib/config';

initConfig({
  api: {
    baseUrl: 'https://api.myapp.com/api',
    sanctum: true,
  },
  auth: {
    provider: 'laravel',
    cookieName: 'laravel_session',
  },
}, true); // Use Laravel defaults
```

### Example 2: Custom Branding

```typescript
initConfig({
  branding: {
    name: 'My Company Dashboard',
    logo: '/assets/logo.svg',
    favicon: '/assets/favicon.ico',
    primaryColor: '#ff6b6b',
    secondaryColor: '#4ecdc4',
  },
});
```

### Example 3: Custom Routes

```typescript
initConfig({
  routes: {
    admin: {
      prefix: '/dashboard',
      login: '/dashboard/login',
      home: '/dashboard',
      custom: '/dashboard/custom',
    },
    public: {
      prefix: '',
      login: '/login',
      home: '/',
    },
  },
});
```

### Example 4: Disable Features

```typescript
initConfig({
  features: {
    i18n: false,
    darkMode: true,
    notifications: false,
    activityLogs: false,
    systemHealth: false,
  },
});
```

---

## Configuration Priority

Configuration is merged in this order (highest to lowest priority):

1. **User Override** (via `initConfig()` or `updateConfig()`)
2. **Environment Variables** (from `.env`)
3. **Laravel Defaults** (if `useLaravelDefaults = true`)
4. **Default Config** (built-in defaults)

---

## Stylesheets (marketing vs admin)

Public pages load **`src/styles/site.css`** from `root.tsx` (Tailwind scan: `(public)/`, marketing components only).

Admin routes load **`src/styles/admin.css`** from `src/routes/[lang]/admin/layout.tsx` (scan: `admin/`, dashboard/admin components; includes `@tailwindcss/forms`).

Shared tokens and reset live in **`src/styles/foundation.css`**. Critical first paint CSS remains inline in `RouterHead` (`lib/perf/critical-css.ts`).

Configs: `tailwind.site.config.js`, `tailwind.admin.config.js` (theme in `tailwind.shared.js`).

---

## Accessing Configuration

```typescript
import { getConfig } from './lib/config';

const config = getConfig();
console.log(config.api.baseUrl);
console.log(config.branding.name);
```

---

## Resetting Configuration

```typescript
import { resetConfig } from './lib/config';

resetConfig(); // Resets to defaults
```
