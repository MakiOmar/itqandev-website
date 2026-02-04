# Extending the Dashboard

Guide on how to extend the Qwik Dashboard with project-specific features.

## Table of Contents

1. [Configuration Architecture](#configuration-architecture)
2. [Adding Custom Routes](#adding-custom-routes)
3. [Creating Custom Components](#creating-custom-components)
4. [Extending Sidebar Menu](#extending-sidebar-menu)
5. [Adding Dashboard Widgets](#adding-dashboard-widgets)
6. [Custom API Endpoints](#custom-api-endpoints)
7. [Project-Specific Pages](#project-specific-pages)

---

## Configuration Architecture

### Separation of Concerns

The dashboard follows a clear separation between **project-specific settings** (from Laravel) and **Qwik-specific configuration** (in Qwik):

#### Project-Specific Settings (From Laravel)

These settings come from your Laravel backend via the `/api/settings` endpoint:

- **Branding**: Logo, project name, colors, favicon
- **General Settings**: Description, support email, support phone
- **Feature Flags**: Project-specific feature toggles
- **Custom Settings**: Any project-specific configuration

**Location**: `src/lib/api/project-settings.ts`

**Usage in Components**:
```typescript
import { useContext } from '@builder.io/qwik';
import { ProjectSettingsContext } from '../../stores/project-settings-store';

export const MyComponent = component$(() => {
  const projectSettings = useContext(ProjectSettingsContext);
  const projectName = projectSettings.settings?.name;
  const projectLogo = projectSettings.settings?.logo;
  
  return <div>{projectName}</div>;
});
```

**Laravel API Response Format**:
```json
{
  "data": {
    "name": "My Project",
    "logo": "/storage/logo.png",
    "favicon": "/storage/favicon.ico",
    "primaryColor": "#3b82f6",
    "description": "Project description",
    "supportEmail": "support@example.com"
  }
}
```

#### Qwik-Specific Configuration

These settings are defined in Qwik and control framework behavior:

- **API Configuration**: Base URL, timeout, headers, Sanctum settings
- **Route Configuration**: Route prefixes, paths
- **Auth Configuration**: Provider type, cookie names, token headers
- **Feature Toggles**: Framework-level features (i18n, dark mode)
- **Build Configuration**: Vite settings, build options

**Location**: `src/lib/config/`

**Files**:
- `src/lib/config/index.ts` - Main config
- `src/lib/config/types.ts` - Type definitions
- `src/lib/config/env.ts` - Environment variable loader
- `src/lib/config/laravel.ts` - Laravel-specific defaults
- `vite.config.ts` - Vite/Qwik build configuration

**Usage**:
```typescript
import { getConfig } from '../lib/config';

const config = getConfig();
const apiBaseUrl = config.api.baseUrl;
const adminPrefix = config.routes.admin.prefix;
```

### Best Practices

1. **Never hardcode project-specific values** in Qwik components
   - ❌ Bad: `<h1>My Project</h1>`
   - ✅ Good: `<h1>{projectSettings.settings?.name}</h1>`

2. **Use Laravel API for all project branding**
   - Logo, name, colors should come from `/api/settings`
   - Qwik config branding is only a fallback

3. **Keep Qwik config for framework concerns only**
   - API endpoints, routes, auth providers
   - Build and development settings
   - Framework feature flags

4. **Environment Variables**
   - Use `VITE_*` for Qwik build-time config
   - Project settings come from Laravel at runtime

### Example: Adding a New Project Setting

**1. Add to Laravel API Response** (`/api/settings`):
```php
return [
    'name' => config('app.name'),
    'logo' => asset('storage/logo.png'),
    'customField' => 'custom value', // New field
];
```

**2. Use in Qwik Component**:
```typescript
const projectSettings = useContext(ProjectSettingsContext);
const customValue = projectSettings.settings?.customField;
```

**3. Type Safety** (optional):
```typescript
// src/lib/api/project-settings.ts
export interface ProjectSettings {
  // ... existing fields
  customField?: string;
}
```

---

## Adding Custom Routes

### Admin Routes

Create routes in `src/routes/(admin)/your-feature/index.tsx`:

```typescript
import { component$ } from '@builder.io/qwik';
import { useAdminAuth } from '../../layout';

export default component$(() => {
  const auth = useAdminAuth();
  
  return (
    <div>
      <h1>Your Custom Admin Page</h1>
    </div>
  );
});
```

### Public Routes

Create routes in `src/routes/(public)/your-page/index.tsx`:

```typescript
import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return (
    <div>
      <h1>Your Public Page</h1>
    </div>
  );
});
```

### Using Extension System

Register routes programmatically:

```typescript
import { registerExtension } from './lib/extensions/registry';
import { YourCustomComponent } from './components/YourCustomComponent';

registerExtension({
  routes: [
    {
      path: '/admin/custom',
      component: YourCustomComponent,
      layout: 'admin',
      roles: ['admin'],
      meta: {
        title: 'Custom Page',
        description: 'Custom admin page',
      },
    },
  ],
});
```

---

## Creating Custom Components

### Reusable Components

Create in `src/components/your-feature/`:

```typescript
import { component$ } from '@builder.io/qwik';

interface YourComponentProps {
  title: string;
}

export const YourComponent = component$<YourComponentProps>((props) => {
  return (
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6">
      <h2>{props.title}</h2>
    </div>
  );
});
```

### Register Component Extension

```typescript
import { registerExtension } from './lib/extensions/registry';

registerExtension({
  components: [
    {
      name: 'CustomCard',
      component: YourCustomCard,
      replace: false, // Set to true to replace existing component
    },
  ],
});
```

---

## Extending Sidebar Menu

### Method 1: Direct Edit

Edit `src/components/dashboard/Sidebar.tsx`:

```typescript
const navItems: NavItem[] = [
  // ... existing items
  {
    label: 'Your Feature',
    href: '/admin/your-feature',
    icon: YourIcon,
    roles: ['admin'],
  },
];
```

### Method 2: Extension System

```typescript
import { registerExtension } from './lib/extensions/registry';
import { YourIcon } from './components/icons';

registerExtension({
  menuItems: [
    {
      label: 'Your Feature',
      href: '/admin/your-feature',
      icon: YourIcon,
      roles: ['admin'],
      order: 100, // Higher number = appears later
    },
  ],
});
```

Then update Sidebar to merge extensions:

```typescript
import { extensions } from '../../lib/extensions/registry';

const extensionItems = extensions.menuItems();
const allNavItems = [...navItems, ...extensionItems];
```

---

## Adding Dashboard Widgets

### Create Widget Component

```typescript
// src/components/widgets/YourWidget.tsx
import { component$ } from '@builder.io/qwik';

export const YourWidget = component$(() => {
  return (
    <div class="bg-white dark:bg-slate-800 rounded-lg p-6">
      <h3>Your Custom Widget</h3>
      {/* Widget content */}
    </div>
  );
});
```

### Register Widget

```typescript
import { registerExtension } from './lib/extensions/registry';

registerExtension({
  widgets: [
    {
      id: 'your-widget',
      component: YourWidget,
      position: 'dashboard',
      roles: ['admin'],
      order: 1,
    },
  ],
});
```

### Display Widgets in Dashboard

Update `src/routes/(admin)/index.tsx`:

```typescript
import { extensions } from '../../lib/extensions/registry';

export default component$(() => {
  const widgets = extensions.widgets().filter(w => w.position === 'dashboard');
  
  return (
    <div>
      {/* Existing dashboard content */}
      {widgets.map(widget => {
        const WidgetComponent = widget.component;
        return <WidgetComponent key={widget.id} />;
      })}
    </div>
  );
});
```

---

## Custom API Endpoints

### Update API Endpoints Config

Edit `src/lib/api/endpoints.ts`:

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  YOUR_FEATURE: {
    LIST: '/api/your-feature',
    GET: (id: string) => `/api/your-feature/${id}`,
    CREATE: '/api/your-feature',
    UPDATE: (id: string) => `/api/your-feature/${id}`,
    DELETE: (id: string) => `/api/your-feature/${id}`,
  },
};
```

### Use in Components

```typescript
import { apiClient } from '../../lib/api/client';
import { API_ENDPOINTS } from '../../lib/api/endpoints';

const data = await apiClient.get(API_ENDPOINTS.YOUR_FEATURE.LIST);
```

---

## Project-Specific Pages

### Recommended Structure

```
your-project/
├── qwik-dashboard/          # This dashboard
├── src/                     # Your project code
│   ├── components/         # Your components
│   ├── routes/             # Your routes (extend dashboard)
│   └── lib/                # Your utilities
└── project-config/         # Project-specific config
    └── dashboard.config.ts # Override dashboard config
```

### Override Configuration

Create `project-config/dashboard.config.ts`:

```typescript
import type { ConfigOverride } from '../qwik-dashboard/src/types';

export const projectConfig: ConfigOverride = {
  branding: {
    name: 'My Project',
    logo: '/logo.png',
  },
  routes: {
    admin: {
      prefix: '/admin',
      // ... custom routes
    },
  },
};
```

Then initialize in your entry point:

```typescript
import { initConfig } from './lib/config';
import { projectConfig } from '../project-config/dashboard.config';

initConfig(projectConfig, true); // true = use Laravel defaults
```

---

## Best Practices

1. **Keep Extensions Organized:** Group related extensions in separate files
2. **Use TypeScript:** Leverage exported types for type safety
3. **Follow Naming Conventions:** Use consistent naming patterns
4. **Document Extensions:** Add comments explaining custom extensions
5. **Test Extensions:** Ensure extensions work with both mock and Laravel auth

---

## Examples

See `examples/` directory for complete working examples of:
- Custom admin pages
- Custom public pages
- Extended sidebar menus
- Custom widgets
- Laravel integration
