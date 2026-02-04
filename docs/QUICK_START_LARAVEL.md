# Quick Start - Laravel Integration

Quick reference for experienced developers to integrate Qwik Dashboard with Laravel.

## 1. Laravel Setup (2 minutes)

```bash
# Install Sanctum
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate

# Configure CORS (config/cors.php)
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_origins' => ['http://localhost:5173'],
'credentials' => true,
```

## 2. Create Auth Routes (routes/api.php)

```php
Route::post('/auth/login', [AuthController::class, 'login']);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
});
```

## 3. Create Auth Controller

```php
public function login(Request $request) {
    if (!Auth::attempt($request->only('email', 'password'))) {
        throw ValidationException::withMessages(['email' => ['Invalid credentials']]);
    }
    return response()->json(['user' => Auth::user()]);
}

public function me(Request $request) {
    return response()->json(['user' => $request->user()]);
}
```

## 4. Qwik Dashboard Configuration (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_LARAVEL_SANCTUM=true
VITE_AUTH_PROVIDER=laravel
VITE_DASHBOARD_PREFIX=/admin
```

## 5. Done!

Start both servers and test:
- Laravel: `php artisan serve`
- Qwik: `npm run dev`
- Visit: `http://localhost:5173/admin/login`

For detailed setup, see [LARAVEL_INTEGRATION.md](./LARAVEL_INTEGRATION.md)
