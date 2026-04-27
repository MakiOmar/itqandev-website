/**
 * User interface (Laravel + Spatie: primary role + optional permission names)
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  /** Primary role name (first Spatie role), used for legacy nav and display */
  role: string;
  /** Spatie permission names from GET /api/me — drives admin nav alongside role */
  permissions?: string[];
  status: 'active' | 'inactive' | 'banned';
  createdAt: string;
  updatedAt: string;
}

/**
 * Auth session interface
 */
export interface AuthSession {
  user: User;
  token: string;
  expiresAt: number;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Register data
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
}
