<?php

/**
 * Example Authentication Controller for Laravel
 * Place in: app/Http/Controllers/AuthController.php
 */

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Login user
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user = Auth::user();
        
        // Ensure user is active
        if ($user->status !== 'active') {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => ['Your account is not active.'],
            ]);
        }

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status ?? 'active',
                'createdAt' => $user->created_at->toISOString(),
                'updatedAt' => $user->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status ?? 'active',
                'createdAt' => $user->created_at->toISOString(),
                'updatedAt' => $user->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Logout user
     */
    public function logout(Request $request)
    {
        // Sanctum: delete current access token if using tokens
        // For cookie-based auth, just return success
        $request->user()->currentAccessToken()?->delete();
        
        Auth::logout();
        
        return response()->json([
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Register new user
     */
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = \App\Models\User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => 'user', // Default role
            'status' => 'active',
        ]);

        // Auto-login after registration
        Auth::login($user);

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'createdAt' => $user->created_at->toISOString(),
                'updatedAt' => $user->updated_at->toISOString(),
            ],
        ], 201);
    }
}
