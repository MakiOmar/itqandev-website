import type { AuthSession, LoginCredentials, RegisterData } from '../types';

/**
 * Base authentication adapter interface
 * All auth adapters must implement this interface
 */
export interface AuthAdapter {
  /**
   * Login with credentials
   */
  login(credentials: LoginCredentials, cookie?: any): Promise<AuthSession | null>;

  /**
   * Logout current session
   * @param cookie - Qwik cookie object (server-side) or undefined (client-side)
   * @param request - Request object with headers (server-side only, optional)
   */
  logout(cookie?: any, request?: { headers: Headers }): Promise<void>;

  /**
   * Get current session
   */
  getSession(cookie?: any, forwardDocumentUrl?: string | null): Promise<AuthSession | null>;

  /**
   * Refresh authentication token
   */
  refreshToken?(cookie?: any): Promise<AuthSession | null>;

  /**
   * Register new user
   */
  register?(data: RegisterData, cookie?: any): Promise<AuthSession | null>;

  /**
   * Check if user is authenticated
   */
  isAuthenticated(cookie?: any): Promise<boolean>;
}
