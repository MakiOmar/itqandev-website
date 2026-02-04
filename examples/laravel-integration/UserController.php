<?php

/**
 * Example User Controller for Laravel
 * Place in: app/Http/Controllers/UserController.php
 */

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    /**
     * Display a listing of users
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->get('perPage', 10);
        $search = $request->get('search');
        $page = (int) $request->get('page', 1);

        $query = User::query();

        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate($perPage, ['*'], 'page', $page);

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

    /**
     * Store a newly created user
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:user,admin,super_admin',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => bcrypt($validated['password']),
            'role' => $validated['role'],
            'status' => 'active',
        ]);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    /**
     * Display the specified user
     */
    public function show(User $user): JsonResponse
    {
        return new UserResource($user);
    }

    /**
     * Update the specified user
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:user,admin,super_admin',
            'status' => 'sometimes|in:active,inactive,banned',
        ]);

        $user->update($validated);

        return new UserResource($user);
    }

    /**
     * Remove the specified user
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully',
        ]);
    }

    /**
     * Bulk delete users
     */
    public function bulkDelete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'userIds' => 'required|array',
            'userIds.*' => 'exists:users,id',
        ]);

        $deleted = User::whereIn('id', $validated['userIds'])->delete();

        return response()->json([
            'message' => "Successfully deleted {$deleted} user(s)",
            'deletedCount' => $deleted,
        ]);
    }
}
