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
  /** "Remember me": persistent cookie for `auth.rememberDays` instead of a browser-session cookie. */
  remember?: boolean;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * Register data
 */
export interface RegisterData {
  email: string;
  password: string;
  name: string;
}
