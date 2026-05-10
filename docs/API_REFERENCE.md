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

### GET `/api/public/site-meta`

Returns branding and `site_languages` for the marketing shell (see `SettingsController::publicMeta`).

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

## Common Issues

### Issue: 419 CSRF Token Mismatch

**Solution:** Ensure you call `/sanctum/csrf-cookie` before login and include the token in `X-CSRF-TOKEN` header.

### Issue: CORS Errors

**Solution:** Configure CORS in `config/cors.php` to allow your Qwik frontend domain with credentials.

### Issue: Session Not Persisting

**Solution:** Check cookie domain, secure flag, and sameSite settings in Laravel session config.

---

For more details, see [LARAVEL_INTEGRATION.md](./LARAVEL_INTEGRATION.md)
