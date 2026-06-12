# Laravel API Integration Reference

Reference guide for Laravel API endpoints expected by Qwik Dashboard.

## Table of Contents

1. [Authentication Endpoints](#authentication-endpoints)
2. [User Management Endpoints](#user-management-endpoints)
3. [Response Formats](#response-formats)
4. [Error Handling](#error-handling)
5. [Request/Response Examples](#requestresponse-examples)

---

## Authentication Endpoints

### POST `/api/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "token": "1|...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "roles": [{ "id": 1, "name": "admin" }],
    "permissions": ["manage projects", "manage users"],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

The `token` is a Sanctum personal access token. The Qwik client stores it and sends `Authorization: Bearer {token}`. The `user.permissions` array lists effective Spatie permission names (for dashboard navigation and UI checks).

**Error Response (422):**
```json
{
  "message": "The provided credentials are incorrect.",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

### GET `/api/me`

**Headers:**

- `Authorization: Bearer {token}` (primary)
- `Cookie: laravel_session=...` (only if you use Sanctum SPA / cookie mode)

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "user@example.com",
    "role": "admin",
    "roles": [{ "id": 1, "name": "admin" }],
    "permissions": ["manage projects", "manage system"],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### GET `/api/v1/system/health`

Requires `Authorization` as above. Responds **403** if the user cannot run system diagnostics (`manage system` permission or `admin` / `super_admin` role). Returns app, PHP, Laravel versions, database ping status, default cache store, and queue connection name.

**Error Response (401):**
```json
{
  "message": "Unauthenticated."
}
```

### POST `/api/auth/logout`

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

### POST `/api/v1/content-slugs/suggest`

**Auth:** Required (Sanctum). Authorizes with `viewAny` on the chosen content model.

**Body (JSON):**

| Field | Type | Description |
|-------|------|-------------|
| `entity` | string | One of: `projects`, `blog_posts`, `services`, `categories`, `skills` |
| `source` | string | Title or provisional slug text (max 255); server runs `Str::slug()` then uniquifies |
| `ignore_id` | int (optional) | When editing, current record id so its own slug is not treated as a collision |

**Success (200):**
```json
{
  "slug": "my-post-2",
  "base": "my-post"
}
```

**Error (422):** Empty slug after normalization (e.g. only punctuation).

---

## User Management Endpoints

### GET `/api/users`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `perPage` (number): Items per page (default: 10)
- `search` (string): Search query

**Success Response (200):**
```json
{
  "data": [
    {
      "id": "1",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "perPage": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### GET `/api/users/{id}`

**Success Response (200):**
```json
{
  "data": {
    "id": "1",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "admin",
    "status": "active"
  }
}
```

### POST `/api/users`

**Request:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "password123",
  "role": "user"
}
```

**Success Response (201):**
```json
{
  "data": {
    "id": "2",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user",
    "status": "active"
  }
}
```

### PUT `/api/users/{id}`

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane.smith@example.com"
}
```

**Success Response (200):**
```json
{
  "data": {
    "id": "2",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "user"
  }
}
```

### DELETE `/api/users/{id}`

**Success Response (200):**
```json
{
  "message": "User deleted successfully"
}
```

---

## Response Formats

### Standard API Resource Format

Laravel API Resources should return:

```json
{
  "data": {
    // Resource data
  }
}
```

### Paginated Response Format

```json
{
  "data": [
    // Array of resources
  ],
  "meta": {
    "currentPage": 1,
    "perPage": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Response Format

**Validation Errors (422):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

**Generic Errors:**
```json
{
  "message": "Error message here",
  "error": "Optional error code"
}
```

---

## Error Handling

### HTTP Status Codes

- **200**: Success
- **201**: Created
- **204**: No Content
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **422**: Validation Error
- **500**: Server Error

### Laravel Validation Errors

The Qwik dashboard automatically handles Laravel's validation error format:

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

These are automatically mapped to form field errors in Qwik components.

---

## Request/Response Examples

### Complete Login Flow

**1. Get CSRF Cookie:**
```http
GET /sanctum/csrf-cookie
```

**2. Login:**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}
```

**3. Get User:**
```http
GET /api/auth/me
Cookie: laravel_session=...
```

### Complete User Management Flow

**1. List Users:**
```http
GET /api/users?page=1&perPage=10&search=john
Cookie: laravel_session=...
```

**2. Create User:**
```http
POST /api/users
Content-Type: application/json
Cookie: laravel_session=...

{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"
}
```

**3. Update User:**
```http
PUT /api/users/1
Content-Type: application/json
Cookie: laravel_session=...

{
  "name": "Updated Name"
}
```

**4. Delete User:**
```http
DELETE /api/users/1
Cookie: laravel_session=...
```

---

## Laravel Implementation Examples

### User Model

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
```

### User Resource

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => (string) $this->id,
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

### Paginated Response

```php
$users = User::paginate(10);

return response()->json([
    'data' => UserResource::collection($users->items()),
    'meta' => [
        'currentPage' => $users->currentPage(),
        'perPage' => $users->perPage(),
        'total' => $users->total(),
        'totalPages' => $users->lastPage(),
    ],
]);
```

---

## Public marketing (no auth)

### GET `/api/public/ping`

Unauthenticated server check for local dev, Vite proxy, and deployment smoke tests. Returns Laravel/PHP versions and database connectivity (no secrets).

**Success (200):**

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "message": "Laravel API is reachable",
    "timestamp": "2026-05-24T12:00:00+00:00",
    "server_ms": 12,
    "app_env": "local",
    "app_url": "http://localhost",
    "laravel_version": "11.x",
    "php_version": "8.3.x",
    "database": {
      "status": "ok",
      "connection": "sqlite",
      "error": null
    }
  }
}
```

When the database is unreachable, `data.status` is `degraded` and `database.status` is `error` (error message only when `APP_DEBUG=true`).

`data.server_ms` is Laravel processing time in milliseconds (DB ping included). Compare with browser round-trip time on **`/{lang}/api-check`** (e.g. `/en/api-check`) to tell slow PHP/DB from slow proxy or WAMP.

Also available: `GET /api/health` (minimal `{ "status": "ok" }`) and Laravel’s `GET /up`.

### GET `/api/public/site-meta`

Returns **locale-resolved** branding, `site_languages`, and resolved **`typography`** for the marketing shell (see `SettingsController::publicMeta`, `SiteSettingsPresenter`, and `TypographyResolver`).

**Locale:** optional `locale` query and/or `X-Content-Locale` header. When set to a non-default site language, `site_name`, `site_description`, and `site_address` are overlaid from `settings_translations` (fallback to primary when a field is missing). Raw `settings_translations` is never returned on public endpoints.

**`data.typography` shape:**

```json
{
  "mode": "system",
  "ltr": {
    "css_family": "Inter",
    "fallback_stack": "Inter, system-ui, …",
    "google_css_href": "https://fonts.googleapis.com/css2?family=Inter…",
    "sources": {}
  },
  "rtl": {
    "css_family": "Cairo",
    "fallback_stack": "Cairo, …",
    "google_css_href": "https://fonts.googleapis.com/css2?family=Cairo…",
    "sources": {}
  }
}
```

When `mode` is `custom`, `google_css_href` is omitted and `sources` maps format keys (`woff2`, `woff`, …) to public URLs.

### GET `/api/public/shell`

**Preferred for marketing SSR** — one response for layout chrome instead of separate `site-meta`, `menus/primary`, and `services` calls.

**Query:** `locale` — UI locale (e.g. `en`, `ar`). Sends `X-Content-Locale` when the Qwik client passes a presentation locale.

**Success (200):**

```json
{
  "success": true,
  "data": {
    "site_meta": {
      "name": "…",
      "site_languages": [],
      "default_locale": "en",
      "features": { "projects": true, "services": true }
    },
    "menu": {
      "slug": "primary",
      "locale": "en",
      "items": []
    },
    "services": []
  }
}
```

- `site_meta` — same shape as `GET /api/public/site-meta` `data` (localized for the shell’s presentation locale).
- `menu` — same shape as `GET /api/public/menus/primary` `data`.
- `services` — published services array (empty when the `services` feature module is disabled). Same records as `GET /api/public/services`.

Cached server-side (~300s) per `locale` + presentation locale key. Legacy endpoints remain available for tools and gradual migration.

### GET `/api/public/site-content`

Returns localized marketing blocks from `marketing_site_content` in project settings: `pricingTiers`, `faq`, `contact`, `about`, `techStack`.

**Locale:** `locale` query and/or `X-Content-Locale`. Merges `settings_translations.{locale}.marketing_site_content` onto primary content with primary fallback for missing fields. Cached per locale (~300s).

### Locale behavior for public listings

When a locale is provided (for example via `X-Content-Locale` header or the menus `locale` query), listing responses are strict by locale:

- Records are included only if they have content in the selected locale.
- Primary-language fallback is not used for missing translations in listings.
- For default locale, records with default primary content (including `content_locale = null` where applicable) are still valid.

### GET `/api/public/menus/{slug}`

**Query:** `locale` — UI locale code (e.g. `en`, `ar`); must be an enabled site language or the default is used.

**Success (200):**

```json
{
  "success": true,
  "data": {
    "slug": "primary",
    "locale": "en",
    "items": [
      {
        "label": "Services",
        "href": "/en/services/",
        "open_in_new_tab": false,
        "children": []
      }
    ]
  }
}
```

When the menu is missing or has no resolvable items, `items` is an empty array (the Qwik header falls back to built-in links).

## Authenticated fonts (Qwik admin / Sanctum token)

Requires `Authorization: Bearer` and the **`manage fonts`** permission.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/fonts` | Paginated list (`search`, `per_page`) |
| POST | `/api/v1/fonts` | Create (`name`, `css_family`, at least one `file_*` URL) |
| GET | `/api/v1/fonts/{id}` | Show font |
| PUT | `/api/v1/fonts/{id}` | Update font |
| DELETE | `/api/v1/fonts/{id}` | Delete (422 if assigned in typography settings) |
| POST | `/api/v1/fonts/upload` | Multipart `file` + `format` (`woff2`, `woff`, `ttf`, `eot`, `svg`) → `{ url }` |

**Settings typography** (`PUT /api/settings`): `font_mode` (`system` \| `custom`), `font_ltr_id`, `font_rtl_id`. When `font_mode` is `custom`, both font IDs are required.

**Settings authorization:** `GET` and `PUT /api/settings` require the `manageSettings` gate (`admin` or `super_admin` roles). Other authenticated roles receive `403`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/dashboard/metrics` | Aggregate dashboard stat cards (projects, categories, skills, testimonials, blog, services, media) respecting `features.*` module toggles |

## Authenticated menus (Vue admin / Sanctum token)

Requires `Authorization: Bearer` and the **`manage menus`** permission (or a role that includes it).

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/menus` | List menus |
| POST | `/api/v1/menus` | Create menu (`name`, `slug`) |
| GET | `/api/v1/menus/{id}` | Menu with nested `items` tree |
| PUT | `/api/v1/menus/{id}` | Update `name` / `slug` |
| DELETE | `/api/v1/menus/{id}` | Delete menu (cascades items) |
| POST | `/api/v1/menus/{id}/items` | Create item (`item_type`, optional `label`, type-specific fields) |
| PUT | `/api/v1/menus/{id}/items/reorder` | Body `{ "items": [{ "id", "parent_id", "sort_order" }] }` |
| PUT | `/api/v1/menu-items/{id}` | Update item |
| DELETE | `/api/v1/menu-items/{id}` | Delete item |

**`item_type` values:** `custom_link` (requires `url`), `static_route` (requires `static_route_key`: `home`, `services`, `work`, `about`, `pricing`, `blog`, `contact`), `project`, `blog_post`, `service` (each requires `reference_id`).

## Testing API Integration

### Using Laravel Tinker

```bash
php artisan tinker

# Create test user
User::create([
    'name' => 'Test User',
    'email' => 'test@example.com',
    'password' => bcrypt('password123'),
    'role' => 'admin',
]);
```

### Using Postman/Insomnia

1. First, get CSRF cookie: `GET /sanctum/csrf-cookie`
2. Then make authenticated requests with cookies enabled
3. Include `X-Requested-With: XMLHttpRequest` header

---

## Translatable content export / import (authenticated)

Locale-aware JSON export/import is available for admin translatable types. Each module is gated by its `feature.module:*` flag. All endpoints require Sanctum auth and a valid **`X-Content-Locale`** header (enabled site language).

| Entity key (`entity` in JSON) | Export | Import | Module |
|------------------------------|--------|--------|--------|
| `categories` | `GET /api/v1/categories/export` | `POST /api/v1/categories/import` | categories |
| `skills` | `GET /api/v1/skills/export` | `POST /api/v1/skills/import` | skills |
| `projects` | `GET /api/v1/projects/export` | `POST /api/v1/projects/import` | projects |
| `services` | `GET /api/v1/services/export` | `POST /api/v1/services/import` | services |
| `blog_posts` | `GET /api/v1/blog-posts/export` | `POST /api/v1/blog-posts/import` | blog |
| `testimonials` | `GET /api/v1/testimonials/export` | `POST /api/v1/testimonials/import` | testimonials |

**Taxonomies** (`categories`, `skills`): localized `name`, `description`, plus `slug` and `id`. Categories include `is_featured`; skills include `icon_hint`.

**Content types:**

- **projects:** `title`, `summary`, `description`, `featured`, `slug`, `id`
- **services:** `name`, `short_description`, `description`, `process[]`, `deliverables[]`, `slug`, `id`
- **blog_posts:** `title`, `excerpt`, `content`, `featured`, `slug`, `id`
- **testimonials:** `content`, `client_role`, `company`, `client_name` (primary only), `project_id`, `id` — no `slug`; match by **`id`** on import

Export uses the same locale visibility rules as each type’s admin list (`scopeQueryForPresentationLocale` + presenter overlay). Import modes: `upsert` (default) or `translation_only` (query/body `mode`).

### GET `/api/v1/categories/export` (example)

**Query (optional):**

| Param | Type | Description |
|-------|------|-------------|
| `ids[]` | int[] | Export only these category IDs (still filtered by locale content rules) |

**Success (200):** JSON file download (`Content-Type: application/json`) with envelope:

```json
{
  "format": "credocode.content-export",
  "version": 1,
  "entity": "categories",
  "locale": "ar",
  "exported_at": "2026-05-28T12:00:00+00:00",
  "items": [
    {
      "id": 12,
      "slug": "web-development",
      "name": "Localized name",
      "description": "Localized description",
      "is_featured": false
    }
  ]
}
```

Each item includes **`id`** (database primary key) so imports can target the exact record on this server. `slug` remains the stable key for creates and slug-based matching.

**Error (422):** Missing or invalid `X-Content-Locale`.

### POST `/api/v1/categories/import`

**Query or body:**

| Field | Type | Description |
|-------|------|-------------|
| `mode` | string | `upsert` (default) or `translation_only` |

**Body:** Full export envelope JSON (must match `entity`, `version`, and `locale` with the request header).

**Item matching (per row):**

1. If **`id`** is set, load that category first. When **`slug`** is also present, it must match that record or the row is rejected.
2. Otherwise match by **`slug`** (required for new creates in `upsert` mode).
3. In **`translation_only`** mode, each row must resolve via **`id`** or **`slug`**; unknown records are skipped with an error.

**Import modes:**

- **`upsert`:** Update primary columns when import locale is the record’s primary language, otherwise upsert a `category_translations` row; create a new category when neither `id` nor `slug` matches an existing row (create requires `slug`).
- **`translation_only`:** Update existing records only (`id` or `slug`); never create; unknown rows go to `errors`.

**Success (200):**

```json
{
  "mode": "upsert",
  "locale": "ar",
  "created": 1,
  "updated": 4,
  "skipped": 0,
  "errors": [{ "slug": "unknown", "message": "Category not found (translation_only mode)." }]
}
```

**Error (422):** Invalid envelope (`format`, `entity`, `version`, or `locale` mismatch).

Throttle: `throttle:bulk` on import.

---

## Common Issues

### Issue: 419 CSRF Token Mismatch

**Solution:** Ensure you call `/sanctum/csrf-cookie` before login and include the token in `X-CSRF-TOKEN` header.

### Issue: CORS Errors

**Solution:** Configure CORS in `config/cors.php` to allow your Qwik frontend domain with credentials.

### Issue: Session Not Persisting

**Solution:** Check cookie domain, secure flag, and sameSite settings in Laravel session config.

---

For more details, see [LARAVEL_INTEGRATION.md](./LARAVEL_INTEGRATION.md)
