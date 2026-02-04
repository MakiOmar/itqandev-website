# Qwik Dashboard

A reusable Qwik dashboard framework designed to work seamlessly with Laravel backends. Supports both admin dashboard and public site functionality with easy extension points and comprehensive Laravel integration.

## 🚀 Quick Start with Laravel

See [docs/QUICK_START_LARAVEL.md](./docs/QUICK_START_LARAVEL.md) for a 5-minute setup guide.

For complete integration instructions, see [docs/LARAVEL_INTEGRATION.md](./docs/LARAVEL_INTEGRATION.md).

## Features

### Core Features
- **Authentication System** - Mock authentication with role-based access control
- **Dashboard Home** - Overview with statistics cards and recent activity
- **User Profile** - Manage personal information and change password
- **User Management** - Full CRUD operations for users (Admin only)
- **Settings** - Application configuration and preferences (Admin only)
- **Activity Logs** - System audit trail and activity monitoring (Admin only)
- **Notifications** - Notification center with read/unread management
- **System Health** - Server status and performance metrics (Super Admin only)

### Technical Features
- **Qwik Framework** - Resumable rendering for optimal performance
- **Qwik City** - File-based routing with SSR support
- **Qwik UI** - Styled components with Tailwind CSS
- **Role-Based Access Control** - Super Admin, Admin, and User roles
- **Responsive Design** - Mobile-first approach
- **Mock API Structure** - Ready for backend integration
- **TypeScript** - Full type safety
- **SweetAlert2** - Beautiful confirmation dialogs and toasts

## Tech Stack

- **@builder.io/qwik** - Core Qwik framework
- **@builder.io/qwik-city** - Routing and SSR
- **@qwik-ui/headless** - Headless UI components
- **@qwik-ui/styled** - Styled components
- **qwik-speak** - Internationalization (ready for setup)
- **Tailwind CSS** - Utility-first CSS framework
- **SweetAlert2** - Alert and toast notifications
- **TypeScript** - Type safety

## Getting Started

### Prerequisites
- Node.js 18.17.0 or higher
- npm or pnpm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Login Credentials

The application includes mock authentication with the following demo accounts:

- **Super Admin**: `superadmin@example.com` / `password123`
- **Admin**: `admin@example.com` / `password123`
- **User**: `user@example.com` / `password123`

## Project Structure

```
src/
├── components/
│   ├── common/          # Reusable components (DataTable, StatCard, etc.)
│   ├── dashboard/      # Dashboard-specific components (Sidebar, Header)
│   └── ui/             # Qwik UI styled components
├── lib/
│   ├── api/            # API client and mock data
│   ├── auth/           # Authentication logic
│   ├── constants/      # Constants (roles, routes)
│   └── utils/          # Utility functions
├── routes/
│   ├── (dashboard)/    # Dashboard pages (grouped layout)
│   ├── login/         # Login page
│   └── layout.tsx     # Root layout
├── stores/            # Global state stores
└── i18n/             # Internationalization (ready for setup)
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run fmt` - Format code with Prettier

## Pages

### Dashboard (`/`)
Overview page with statistics cards, metrics, and recent activity feed.

### Profile (`/profile`)
User profile management page where users can:
- Update personal information
- Change password
- View account details

### Users (`/users`) - Admin Only
User management page with:
- Data table with pagination, search, and sorting
- Create, edit, and delete users
- Bulk actions
- Role assignment

### Settings (`/settings`) - Admin Only
Application settings page including:
- General settings (site name, description)
- Email/SMTP configuration
- Maintenance mode toggle
- Multilingual settings

### Activity Logs (`/activity`) - Admin Only
System activity monitoring with:
- Audit trail of all actions
- Filtering and search
- Export functionality

### Notifications (`/notifications`)
Notification center with:
- List of all notifications
- Mark as read/unread
- Delete notifications

### System Health (`/system`) - Super Admin Only
System monitoring dashboard showing:
- Server and database status
- Storage usage
- Cache statistics
- Scheduled tasks

## Components

### Reusable Components

- **DataTable** - Full-featured data table with pagination, search, sorting, and bulk selection
- **StatCard** - Statistics card for displaying metrics
- **PageHeader** - Consistent page header with title and description
- **LoadingSpinner** - Loading indicator
- **EmptyState** - Empty state component
- **ConfirmDialog** - SweetAlert2 wrapper for confirmations
- **UserDropdown** - User menu dropdown

## Laravel Integration

This dashboard is designed to work seamlessly with Laravel backends:

- **Laravel Sanctum Support** - Cookie-based authentication
- **CSRF Token Handling** - Automatic CSRF token management
- **Laravel API Client** - Specialized client for Laravel API responses
- **Auth Adapters** - Pluggable authentication system

### Quick Integration

1. Install Laravel Sanctum in your Laravel project
2. Configure CORS for your Qwik frontend
3. Set environment variables (see `.env.example`)
4. Start using the dashboard!

See [docs/LARAVEL_INTEGRATION.md](./docs/LARAVEL_INTEGRATION.md) for complete setup instructions.

## API Structure

The project includes a flexible API structure:

- **API Client** (`src/lib/api/client.ts`) - Standard HTTP client
- **Laravel API Client** (`src/lib/api/laravel-client.ts`) - Laravel-optimized client
- **Endpoints** (`src/lib/api/endpoints.ts`) - API endpoint definitions
- **Mock Data** (`src/lib/api/mock-data.ts`) - Mock data for development

The dashboard automatically uses the Laravel client when `VITE_LARAVEL_SANCTUM=true` is set.

## Authentication

The dashboard supports multiple authentication providers:

- **Mock Auth** (default) - For development and testing
- **Laravel Sanctum** - Cookie-based authentication for Laravel
- **Custom Adapters** - Create your own auth adapter

### Using Laravel Authentication

1. Set `VITE_AUTH_PROVIDER=laravel` in `.env`
2. Set `VITE_LARAVEL_SANCTUM=true`
3. Configure your Laravel backend (see [LARAVEL_INTEGRATION.md](./docs/LARAVEL_INTEGRATION.md))
4. The dashboard will automatically use Laravel authentication

### Creating Custom Auth Adapter

See [docs/EXTENDING.md](./docs/EXTENDING.md) for instructions on creating custom authentication adapters.

## Role-Based Access Control

The application supports three roles:

- **Super Admin** - Full system access including System Health
- **Admin** - Access to Users, Settings, and Activity Logs
- **User** - Basic access to Dashboard, Profile, and Notifications

Routes and components automatically filter based on user roles.

## Styling

The project uses Tailwind CSS with a custom theme. Colors and styling can be customized in:
- `src/global.css` - CSS variables for theming
- `tailwind.config.js` - Tailwind configuration

## Internationalization

The project includes qwik-speak for internationalization. To enable:

1. Set up translation files in `src/i18n/`
2. Configure qwik-speak in the root layout
3. Use translation functions in components

## Extending the Project

This dashboard is designed to be extended for project-specific needs:

1. **Add New Pages** - Create new routes in `src/routes/(dashboard)/`
2. **Add New Components** - Add reusable components in `src/components/`
3. **Extend API** - Add new endpoints in `src/lib/api/endpoints.ts`
4. **Add Features** - Follow existing patterns for consistency

## Troubleshooting & Anti-Patterns

This section documents common issues and anti-patterns to avoid when working with this Qwik project.

### ❌ DO NOT: Apply Route Loaders to All Routes Without Exceptions

**Problem:** Creating a route loader in the root layout that runs on ALL routes (including login page) can cause redirect loops.

**Example (WRONG):**
```typescript
// src/routes/layout.tsx
export const useAuth = routeLoader$(async ({ cookie, url, redirect: redirectFn }) => {
  const session = getSessionFromCookie(cookie);
  if (!session) {
    throw redirectFn(302, '/login'); // This will loop if on /login!
  }
  return session;
});
```

**Solution:** Always check if the current route is a public route (like login) before redirecting:
```typescript
export const useAuth = routeLoader$(async ({ cookie, url, redirect: redirectFn }) => {
  const pathname = url.pathname;
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const isLoginPage = normalizedPath === '/login' || normalizedPath === ROUTES.LOGIN;
  const isApiRoute = pathname.startsWith('/api/');

  // Skip auth check for login page and API routes
  if (isLoginPage || isApiRoute) {
    // For login page: if logged in, redirect to home; if not, allow access
    if (isLoginPage) {
      const session = getSessionFromCookie(cookie);
      if (session) {
        throw redirectFn(302, ROUTES.HOME);
      }
      return null;
    }
    return null;
  }

  // For protected routes, require authentication
  const session = getSessionFromCookie(cookie);
  if (!session) {
    throw redirectFn(302, ROUTES.LOGIN);
  }
  return session;
});
```

### ❌ DO NOT: Use Manual Chunks in SSR/Preview Builds

**Problem:** Applying `manualChunks` to SSR builds causes circular dependency errors like "Cannot access 'f' before initialization".

**Example (WRONG):**
```typescript
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: (id) => { ... } // Applied to ALL builds including SSR
    }
  }
}
```

**Solution:** Only apply manual chunks to client builds, use `inlineDynamicImports: true` for SSR:
```typescript
// vite.config.ts
build: {
  rollupOptions: isClientBuild ? {
    output: {
      manualChunks: (id) => { ... }
    }
  } : {
    output: {
      inlineDynamicImports: true, // Prevents circular dependencies in SSR
    }
  }
}
```

### ❌ DO NOT: Import Browser-Only Libraries Directly in SSR Context

**Problem:** Libraries like SweetAlert2 that use browser APIs (`window`, `document`) will break SSR.

**Example (WRONG):**
```typescript
import Swal from 'sweetalert2'; // ❌ Breaks SSR

export const showToast = (message: string) => {
  Swal.fire({ ... }); // window/document not available in SSR
};
```

**Solution:** Use dynamic imports with client-side guards:
```typescript
export const showToast = async (message: string) => {
  if (typeof window === 'undefined') return; // Skip in SSR
  
  const Swal = await import('sweetalert2');
  Swal.default.fire({ ... });
};
```

### ❌ DO NOT: Mix Server-Side and Client-Side Auth Storage

**Problem:** Using `localStorage` for auth in a server-rendered app causes hydration mismatches and security issues.

**Example (WRONG):**
```typescript
// Server-side route loader
const session = localStorage.getItem('auth_session'); // ❌ localStorage not available in SSR
```

**Solution:** Use cookies for server-side auth, localStorage only as fallback for client-only code:
```typescript
// Server-side (routeLoader$)
export const useAuth = routeLoader$(async ({ cookie }) => {
  const session = getSessionFromCookie(cookie); // ✅ Use cookies
  return session;
});

// Client-side only (useVisibleTask$ or event handlers)
if (typeof window !== 'undefined') {
  const session = localStorage.getItem('auth_session'); // ✅ Only in browser
}
```

### ❌ DO NOT: Use `window.location` for Navigation

**Problem:** Using `window.location.href` or `window.location.reload()` breaks Qwik's resumable rendering and causes full page reloads.

**Example (WRONG):**
```typescript
const handleSubmit = () => {
  // ... submit logic
  window.location.href = '/dashboard'; // ❌ Full page reload
  // or
  window.location.reload(); // ❌ Loses resumability
};
```

**Solution:** Use Qwik City's `useNavigate()` hook:
```typescript
import { useNavigate, useLocation } from '@builder.io/qwik-city';

export default component$(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = $(() => {
    // ... submit logic
    navigate('/dashboard'); // ✅ SPA navigation
    // or after route action
    navigate(location.url.pathname + location.url.search); // ✅ Re-fetch data
  });
});
```

### ❌ DO NOT: Use `useVisibleTask$` for Server-Side Data Fetching

**Problem:** `useVisibleTask$` runs only in the browser, causing loading delays and SEO issues.

**Example (WRONG):**
```typescript
export default component$(() => {
  const data = useSignal(null);
  
  useVisibleTask$(async () => {
    const response = await fetch('/api/data'); // ❌ Runs only in browser
    data.value = await response.json();
  });
  
  return <div>{data.value ? 'Loaded' : 'Loading...'}</div>; // ❌ Shows loading on SSR
});
```

**Solution:** Use `routeLoader$` for server-side data fetching:
```typescript
// In route file
export const useData = routeLoader$(async () => {
  // ✅ Runs on server, data available immediately
  const data = await fetchData();
  return data;
});

export default component$(() => {
  const data = useData(); // ✅ Data available on both server and client
  return <div>{data.value}</div>;
});
```

### ❌ DO NOT: Handle Forms with Manual Event Handlers

**Problem:** Manual form handling with `onSubmit$` doesn't integrate with Qwik City's form validation and error handling.

**Example (WRONG):**
```typescript
export default component$(() => {
  const handleSubmit = $((event: SubmitEvent) => {
    event.preventDefault();
    // Manual fetch, validation, error handling... ❌
  });
  
  return <form onSubmit$={handleSubmit}>...</form>;
});
```

**Solution:** Use Qwik City's `Form` component with `routeAction$`:
```typescript
export const useCreateUser = routeAction$(
  async (data, { cookie }) => {
    // ✅ Server-side validation with Zod
    const result = await createUser(data);
    return result;
  },
  zod$(userSchema) // ✅ Automatic validation
);

export default component$(() => {
  const action = useCreateUser();
  
  return (
    <Form action={action}>
      {/* ✅ Automatic form handling, validation, errors */}
      <input name="email" />
      {action.value?.failed && action.value.fieldErrors?.email && (
        <p>{action.value.fieldErrors.email}</p>
      )}
    </Form>
  );
});
```

### ❌ DO NOT: Use `useErrorBoundary` for Route-Level Errors

**Problem:** `useErrorBoundary` is for component-level errors, not route-level errors from loaders/actions.

**Example (WRONG):**
```typescript
export default component$(() => {
  const errorBoundary = useErrorBoundary();
  // ❌ Won't catch route loader errors
  if (errorBoundary.error) {
    return <div>Error: {errorBoundary.error.message}</div>;
  }
});
```

**Solution:** Let Qwik City handle route errors, or throw errors from loaders:
```typescript
// In routeLoader$ or routeAction$
export const useData = routeLoader$(async () => {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    throw new Error('Failed to load data'); // ✅ Qwik City handles this
  }
});
```

### ✅ Best Practices Summary

1. **Always check route pathname** before redirecting in route loaders
2. **Use `routeLoader$`** for server-side data fetching
3. **Use `routeAction$`** with `Form` component for form submissions
4. **Use `useNavigate()`** instead of `window.location`
5. **Use cookies** for server-side auth, localStorage only for client-only code
6. **Dynamic import** browser-only libraries with client-side guards
7. **Disable manual chunks** for SSR builds (use `inlineDynamicImports: true`)
8. **Let Qwik City handle** route-level errors via error routes

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
