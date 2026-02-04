<?php

/**
 * Example Laravel API routes for Qwik Dashboard integration
 * Copy this to your Laravel project's routes/api.php
 */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ActivityController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SystemController;

// Public authentication routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Protected routes (require authentication)
Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    
    // User management (admin only)
    Route::middleware('can:manage-users')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::post('/users/bulk-delete', [UserController::class, 'bulkDelete']);
    });
    
    // Settings (admin only)
    Route::middleware('can:manage-settings')->group(function () {
        Route::get('/settings', [SettingsController::class, 'index']);
        Route::put('/settings', [SettingsController::class, 'update']);
    });
    
    // Activity logs (admin only)
    Route::middleware('can:view-activity')->group(function () {
        Route::get('/activity', [ActivityController::class, 'index']);
        Route::get('/activity/export', [ActivityController::class, 'export']);
    });
    
    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('/{id}/read', [NotificationController::class, 'markRead']);
        Route::post('/{id}/unread', [NotificationController::class, 'markUnread']);
        Route::delete('/{id}', [NotificationController::class, 'destroy']);
        Route::get('/preferences', [NotificationController::class, 'preferences']);
    });
    
    // System health (super admin only)
    Route::middleware('can:view-system-health')->group(function () {
        Route::get('/system/health', [SystemController::class, 'health']);
        Route::get('/system/stats', [SystemController::class, 'stats']);
    });
});
