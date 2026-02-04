# Laravel Integration Guide

Complete step-by-step guide to integrate Qwik Dashboard with any Laravel project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (5-Minute Setup)](#quick-start-5-minute-setup)
3. [Laravel Backend Setup](#laravel-backend-setup)
4. [Qwik Dashboard Configuration](#qwik-dashboard-configuration)
5. [Integration Checklist](#integration-checklist)
6. [Common Use Cases](#common-use-cases)
7. [Troubleshooting](#troubleshooting)
8. [Production Deployment](#production-deployment)

---

## Prerequisites

### Laravel Requirements

- **Laravel**: 10.x or 11.x
- **PHP**: 8.1 or higher
- **Laravel Sanctum**: 3.x (for cookie-based authentication)
- **CORS**: Configured for your Qwik frontend domain

### Qwik Dashboard Requirements

- **Node.js**: 18.17.0 or higher
- **npm** or **pnpm**

---

## Quick Start (5-Minute Setup)

### Step 1: Install Laravel Sanctum

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

### Step 2: Configure Sanctum

In `config/sanctum.php`, update the middleware:

```php
'middleware' => [
    'verify_csrf_token' => App\Http\Middleware\VerifyCsrfToken::class,
    'encrypt_cookies' => App\Http\Middleware\EncryptCookies::class,
],
```

In `app/Http/Middleware/VerifyCsrfToken.php`, add your Qwik frontend domain:

```php
protected $except = [
    // Add your Qwik frontend routes if needed
];
```

### Step 3: Configure CORS

In `config/cors.php`:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'], // Your Qwik dev server
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'allowed_methods' => ['*'],
'credentials' => true,
```

### Step 4: Set Qwik Dashboard Environment Variables

Create or update `.env` in your Qwik dashboard project:

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_LARAVEL_SANCTUM=true
VITE_AUTH_PROVIDER=laravel
VITE_DASHBOARD_PREFIX=/admin
VITE_ADMIN_LOGIN=/admin/login
VITE_ADMIN_HOME=/admin
```

### Step 5: Test the Connection

1. Start Laravel: `php artisan serve`
2. Start Qwik: `npm run dev`
3. Visit `http://localhost:5173/admin/login`
4. Try logging in with your Laravel credentials

---

## Laravel Backend Setup

### 1. API Routes Configuration

Create `routes/api.php`:

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // User management (admin only)
    Route::middleware('can:manage-users')->group(function () {
        Route::apiResource('users', UserController::class);
    });
});
```

### 2. Authentication Controller

Create `app/Http/Controllers/AuthController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role, // Assuming you have a role field
            ],
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json(['message' => 'Logged out successfully']);
    }
}
```

### 3. User API Resource

Create `app/Http/Resources/UserResource.php`:

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'status' => $this->status ?? 'active',
            'createdAt' => $this->created_at->toISOString(),
            'updatedAt' => $this->updated_at->toISOString(),
        ];
    }
}
```

### 4. User Controller Example

Create `app/Http/Controllers/UserController.php`:

```php
<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('perPage', 10);
        $search = $request->get('search');
        
        $query = User::query();
        
        if ($search) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        $users = $query->paginate($perPage);
        
        return response()->json([
            'data' => UserResource::collection($users->items()),
            'meta' => [
                'currentPage' => $users->currentPage(),
                'perPage' => $users->perPage(),
                'total' => $users->total(),
                'totalPages' => $users->lastPage(),
            ],
        ]);
    }

    public function show(User $user)
    {
        return new UserResource($user);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'role' => 'required|in:user,admin,super_admin',
        ]);

        $user = User::create($validated);
        
        return new UserResource($user);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:user,admin,super_admin',
        ]);

        $user->update($validated);
        
        return new UserResource($user);
    }

    public function destroy(User $user)
    {
        $user->delete();
        
        return response()->json(['message' => 'User deleted successfully']);
    }
}
```

### 5. Project Settings API Endpoint

**Important:** Project-specific settings (logo, branding, etc.) should come from Laravel, not Qwik config.

Create `app/Http/Controllers/SettingsController.php`:

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SettingsController extends Controller
{
    /**
     * Get project settings
     * These settings are used by Qwik dashboard for branding and project-specific configuration
     */
    public function index(Request $request)
    {
        return response()->json([
            'data' => [
                // Branding (project-specific)
                'name' => config('app.name'),
                'logo' => asset('storage/logo.png'), // Or use Storage::url() for cloud storage
                'favicon' => asset('storage/favicon.ico'),
                'primaryColor' => config('app.primary_color', '#3b82f6'),
                'secondaryColor' => config('app.secondary_color', '#8b5cf6'),
                
                // General settings
                'description' => config('app.description', ''),
                'supportEmail' => config('app.support_email', ''),
                'supportPhone' => config('app.support_phone', ''),
                
                // Feature flags (project-specific)
                'features' => [
                    'customFeature' => config('app.features.custom_feature', false),
                    // Add your project-specific feature flags
                ],
                
                // Add any other project-specific settings
            ],
        ]);
    }
}
```

Add route in `routes/api.php`:

```php
Route::middleware('auth:sanctum')->group(function () {
    // ... other routes
    Route::get('/settings', [SettingsController::class, 'index']);
});
```

**Note:** The Qwik dashboard automatically fetches these settings on page load. The settings are used for:
- Header logo and project name
- Sidebar branding
- Any project-specific configuration

See [EXTENDING.md](./EXTENDING.md#configuration-architecture) for more details on the separation between Laravel project settings and Qwik configuration.

### 6. CSRF Token Endpoint

Laravel Sanctum provides this automatically. Ensure your Qwik dashboard calls `/sanctum/csrf-cookie` before login (the LaravelApiClient does this automatically).

---

## Qwik Dashboard Configuration

### Environment Variables

Create `.env` file in your Qwik dashboard root:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_LARAVEL_SANCTUM=true
VITE_CSRF_TOKEN_ENABLED=true

# Route Configuration
VITE_DASHBOARD_PREFIX=/admin
VITE_ADMIN_LOGIN=/admin/login
VITE_ADMIN_HOME=/admin
VITE_PUBLIC_PREFIX=
VITE_PUBLIC_LOGIN=/login
VITE_PUBLIC_HOME=/

# Authentication Configuration
VITE_AUTH_PROVIDER=laravel
VITE_AUTH_COOKIE_NAME=laravel_session
VITE_AUTH_TOKEN_HEADER=Authorization
VITE_AUTH_STORAGE=cookie

# Branding (fallback only - actual branding comes from Laravel /api/settings)
VITE_APP_NAME=My Laravel App
```

**Important:** The `VITE_APP_NAME` and other branding env vars are **fallback defaults only**. The actual project branding (logo, name, colors) should come from your Laravel `/api/settings` endpoint. See [Configuration Architecture](./EXTENDING.md#configuration-architecture) for details.

### Initialize Configuration

In your Qwik dashboard's `src/root.tsx` or entry point, initialize the config:

```typescript
import { initConfig } from './lib/config';

// Initialize with Laravel defaults
initConfig(undefined, true); // true = use Laravel defaults
```

Or use environment-based initialization (automatic):

```typescript
// Config auto-initializes based on VITE_AUTH_PROVIDER
// No manual initialization needed
```

---

## Integration Checklist

### Laravel Backend

- [ ] Laravel Sanctum installed and configured
- [ ] CORS configured for Qwik frontend domain
- [ ] API routes created (`/api/auth/login`, `/api/auth/me`, etc.)
- [ ] Authentication controller implemented
- [ ] User model has `role` field (or equivalent)
- [ ] API resources created for consistent responses
- [ ] Middleware configured for protected routes
- [ ] CSRF protection configured
- [ ] Project settings endpoint created (`/api/settings`) with branding (logo, name, etc.)

### Qwik Dashboard

- [ ] Environment variables set in `.env`
- [ ] `VITE_LARAVEL_SANCTUM=true` set
- [ ] `VITE_AUTH_PROVIDER=laravel` set
- [ ] API base URL points to Laravel backend
- [ ] Configuration initialized (or auto-initialized)
- [ ] Test login functionality
- [ ] Test protected routes
- [ ] Test API calls from dashboard pages

### Testing

- [ ] Can fetch CSRF token from `/sanctum/csrf-cookie`
- [ ] Can login with Laravel credentials
- [ ] Can access `/api/auth/me` when authenticated
- [ ] Can logout successfully
- [ ] Admin routes require authentication
- [ ] Public routes are accessible without auth

---

## Common Use Cases

### Use Case 1: Admin Dashboard Only

**Laravel Setup:**
- Only create admin API routes
- All routes under `/api/admin/*`

**Qwik Configuration:**
```env
VITE_DASHBOARD_PREFIX=/admin
VITE_ADMIN_LOGIN=/admin/login
VITE_PUBLIC_PREFIX=
```

### Use Case 2: Public Site + Admin Dashboard

**Laravel Setup:**
- Create both public and admin API routes
- Public routes: `/api/public/*`
- Admin routes: `/api/admin/*`

**Qwik Configuration:**
```env
VITE_DASHBOARD_PREFIX=/admin
VITE_PUBLIC_PREFIX=
VITE_PUBLIC_HOME=/
```

### Use Case 3: Custom Authentication

If you're not using Sanctum, create a custom auth adapter:

```typescript
// src/lib/auth/adapters/custom.ts
import type { AuthAdapter } from './base';
import { CustomApiClient } from '../api/custom-client';

export class CustomAuthAdapter implements AuthAdapter {
  // Implement AuthAdapter interface
}
```

Then in config:
```typescript
initConfig({
  auth: {
    provider: 'custom',
    // ... other config
  }
});
```

---

## Troubleshooting

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS errors when calling Laravel API.

**Solutions:**
1. Check `config/cors.php` - ensure your Qwik domain is in `allowed_origins`
2. Verify `credentials: true` in CORS config
3. Check Laravel logs for CORS middleware issues
4. Ensure `Access-Control-Allow-Credentials` header is set

### Issue: CSRF Token Mismatch

**Symptoms:** 419 errors when making POST/PUT/DELETE requests.

**Solutions:**
1. Ensure Qwik calls `/sanctum/csrf-cookie` before login
2. Check that CSRF token is being sent in `X-CSRF-TOKEN` header
3. Verify `VerifyCsrfToken` middleware configuration
4. Check that cookies are being sent (Sanctum requires cookies)

### Issue: Authentication Not Working

**Symptoms:** Can't login or session not persisting.

**Solutions:**
1. Check Laravel `session.php` configuration
2. Verify cookie domain matches your setup
3. Check that `sanctum` guard is configured in `config/auth.php`
4. Ensure user model uses `HasApiTokens` trait
5. Verify API routes use `auth:sanctum` middleware

### Issue: API Returns 404

**Symptoms:** All API calls return 404.

**Solutions:**
1. Verify API routes are in `routes/api.php`
2. Check that routes are prefixed with `/api`
3. Ensure Laravel API routes are registered
4. Check `RouteServiceProvider` configuration

### Issue: Empty Response or Wrong Format

**Symptoms:** API returns data but Qwik can't parse it.

**Solutions:**
1. Ensure Laravel returns JSON: `response()->json([...])`
2. Check that API Resource format matches expected structure
3. Verify `Accept: application/json` header is sent
4. Check LaravelApiClient error handling

---

## Production Deployment

### Laravel Production Setup

1. **Environment Variables:**
```env
APP_ENV=production
APP_DEBUG=false
SANCTUM_STATEFUL_DOMAINS=yourdomain.com,www.yourdomain.com
SESSION_DOMAIN=.yourdomain.com
```

2. **CORS Configuration:**
```php
'allowed_origins' => ['https://yourdomain.com'],
```

3. **Session Configuration:**
```php
'secure' => true, // HTTPS only
'same_site' => 'lax',
```

### Qwik Dashboard Production Setup

1. **Environment Variables:**
```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_LARAVEL_SANCTUM=true
```

2. **Build for Production:**
```bash
npm run build
```

3. **Deploy:**
- Deploy `dist/` folder to your web server
- Ensure server supports SSR if using Qwik SSR
- Configure reverse proxy if needed

### Security Considerations

1. **HTTPS Only:** Always use HTTPS in production
2. **Cookie Security:** Set `secure: true` and `httpOnly: true`
3. **CORS:** Only allow your production domains
4. **Rate Limiting:** Implement rate limiting on Laravel API routes
5. **CSRF Protection:** Never disable CSRF for state-changing requests

---

## Next Steps

- See [EXTENDING.md](./EXTENDING.md) for how to add custom routes and components
- See [CONFIGURATION.md](./CONFIGURATION.md) for complete configuration reference
- See [API_REFERENCE.md](./API_REFERENCE.md) for Laravel API integration details
