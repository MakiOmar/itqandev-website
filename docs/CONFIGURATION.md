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

**Marketing site — draft `/work/{slug}` preview:** requests from `website/` to Laravel `GET /api/public/projects/{slug}` use **`credentials: 'include'`** in the browser and forward **`Cookie`** / **`Authorization`** from the document request during SSR loaders. SSR also sends **`Origin` / `Referer`** so Laravel Sanctum treats the hop as stateful. If the HTML origin and the Laravel API **`VITE_*_API_*` URL** differ by host or port (**localhost** dev against a hosted API counts), SSR cannot replay the Laravel session cookie; the **`/work/{slug}`** route falls back to a **browser retry** using `credentials: 'include'` so draft preview still loads when you are logged in against that API. If the browser URL host does not match **`SANCTUM_STATEFUL_DOMAINS`** (common case: users open `www.example.com` but `.env` lists only `example.com`), set **`VITE_SITE_URL`** in `website/` to a canonical origin that **is** listed there — the SSR client uses that origin for Sanctum headers while keeping the path from `request.url`. You can instead add both apex and `www` (or a wildcard host pattern Laravel accepts, e.g. **`*.example.com`**) to **`SANCTUM_STATEFUL_DOMAINS`**. For cookie-based preview when ports differ locally (e.g. Vite `:5173` → Laravel `:8000`), include both hosts with ports under **`SANCTUM_STATEFUL_DOMAINS`**.

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
