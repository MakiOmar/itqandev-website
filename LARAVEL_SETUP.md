# Laravel Authentication Setup

This guide will help you configure the Qwik dashboard to use real Laravel credentials.

## Step 1: Create Environment File

Create a `.env` file in the `website` directory with the following configuration:

```env
# Laravel API Configuration
# Set this to your Laravel backend URL (e.g., http://localhost:8000/api)
VITE_API_BASE_URL=http://localhost:8000/api

# Enable Laravel Sanctum authentication
VITE_LARAVEL_SANCTUM=true

# Authentication Provider (must be 'laravel' to use real credentials)
VITE_AUTH_PROVIDER=laravel

# API Timeout (milliseconds)
VITE_API_TIMEOUT=30000

# Admin Routes
VITE_DASHBOARD_PREFIX=/admin
VITE_ADMIN_LOGIN=/admin/login
VITE_ADMIN_HOME=/admin

# Authentication Settings
VITE_AUTH_COOKIE_NAME=laravel_session
VITE_AUTH_STORAGE=cookie
```

## Step 2: Update Your Laravel Backend

Make sure your Laravel backend has:

1. **Sanctum installed and configured** (already done)
2. **CORS configured** to allow requests from your Qwik frontend
3. **API routes** set up:
   - `POST /api/auth/login` - Login endpoint
   - `GET /api/me` - Get current user (protected)
   - `POST /api/auth/logout` - Logout endpoint

## Step 3: CORS Configuration

In your Laravel `config/cors.php`, ensure:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'], // Your Qwik dev server
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'allowed_methods' => ['*'],
'supports_credentials' => true,
```

## Step 4: Restart Development Server

After creating/updating the `.env` file:

```bash
cd website
npm run dev
```

## Step 5: Test Login

1. Navigate to `http://localhost:5173/admin/login`
2. Use your real Laravel user credentials
3. The system will authenticate against your Laravel backend

## Troubleshooting

### Login fails with CORS error
- Check that your Laravel CORS configuration allows your Qwik frontend origin
- Ensure `supports_credentials` is set to `true` in Laravel CORS config

### 401 Unauthorized
- Verify your Laravel backend is running
- Check that the API base URL in `.env` is correct
- Ensure Sanctum is properly configured in Laravel

### CSRF token errors
- The system automatically fetches CSRF tokens from `/sanctum/csrf-cookie`
- Make sure this route is accessible and CORS is configured for it

## Notes

- Demo credentials have been removed from the login page
- Authentication now uses real Laravel user accounts
- Session is managed via Laravel Sanctum cookies
- The `/me` endpoint is used to verify authentication status
