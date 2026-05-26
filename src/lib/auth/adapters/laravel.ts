import type { AuthAdapter } from './base';
import type { AuthSession, LoginCredentials, RegisterData } from '../types';
import type { Cookie } from '@builder.io/qwik-city';
import { getConfig } from '../../config';
import { LaravelApiClient } from '../../api/laravel-client';
import { extractCookieHeader } from '../../api/client';
import { resolveMarketingApiBaseUrl } from '../../marketing/resolve-api-base';

/**
 * Laravel Sanctum authentication adapter
 * Handles Laravel's cookie-based authentication
 */
export class LaravelAuthAdapter implements AuthAdapter {
  private apiClient: LaravelApiClient;
  private config = getConfig();

  constructor() {
    this.apiClient = new LaravelApiClient();
  }

  /**
   * Login with Laravel backend
   */
  async login(credentials: LoginCredentials, cookie?: Cookie): Promise<AuthSession | null> {
    try {
      // First, get CSRF cookie from Laravel
      await this.apiClient.refreshCsrfToken();

      // Login request
      const response = await this.apiClient.post<{
        user: AuthSession['user'];
        token?: string;
      }>('/auth/login', credentials);

      if (!response.success || !response.data) {
        return null;
      }

      // Transform Laravel user data to match frontend User interface
      const laravelUser: any = response.data.user;
      const user: AuthSession['user'] = {
        id: laravelUser.id.toString(),
        email: laravelUser.email,
        name: laravelUser.name,
        avatar: laravelUser.avatar,
        // Map roles array to single role (take first role or highest priority)
        role: (laravelUser as any).role || laravelUser.roles?.[0]?.name || 'user',
        permissions: Array.isArray((laravelUser as any).permissions)
          ? (laravelUser as any).permissions
          : undefined,
        status: laravelUser.status || 'active',
        createdAt: laravelUser.created_at,
        updatedAt: laravelUser.updated_at,
      };

      // Laravel Sanctum uses cookie-based auth, but we also need to store token
      // in localStorage for client-side JavaScript requests
      const session: AuthSession = {
        user,
        token: response.data.token || 'sanctum_cookie', // Use actual token if provided
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };

      // Store session in cookie for server-side access
      if (cookie) {
        cookie.set(this.config.auth.cookieName, JSON.stringify(session), {
          path: '/',
          httpOnly: true,
          sameSite: 'lax',
          secure: import.meta.env.PROD,
          maxAge: [1, 'days'],
        });
      }

      // Also store in localStorage for client-side JavaScript access
      // This is needed because HTTP-only cookies cannot be read by JavaScript
      if (typeof window !== 'undefined') {
        localStorage.setItem(this.config.auth.cookieName, JSON.stringify(session));
      }

      return session;
    } catch (error: any) {
      console.error('Laravel login error:', error);
      throw error;
    }
  }

  /**
   * Logout from Laravel backend
   * Works both server-side (with cookie object) and client-side
   * 
   * According to QWIK_AUTH_LOGIN_LOGOUT.md:
   * - Call POST /api/auth/logout (best effort, ignore errors)
   * - Clear the cookie (server-side for HttpOnly cookies)
   * 
   * @param cookie - Qwik cookie object (server-side) or undefined (client-side)
   * @param request - Request object with headers (server-side only, optional)
   */
  async logout(cookie?: Cookie | any, request?: { headers: Headers }): Promise<void> {
    try {
      // For server-side requests, we need to pass cookies to the API client
      // so it can authenticate via cookie-based auth even if Bearer token is invalid
      if (cookie && typeof window === 'undefined') {
        // Server-side: extract cookie header and pass to API client
        // This allows cookie-based authentication even if Bearer token is invalid
        const cookieHeader = extractCookieHeader(cookie as Cookie, request);
        const serverApiClient = new LaravelApiClient(undefined, cookieHeader || undefined);
        await serverApiClient.post('/auth/logout');
      } else {
        // Client-side: use default API client (will use cookies via credentials: 'include')
        // The API client will send cookies automatically, allowing cookie-based auth
        await this.apiClient.post('/auth/logout');
      }
    } catch (error) {
      // Ignore errors - logout should always succeed on client side
      // Even if API call fails, we'll clear cookies and localStorage
      // This matches the documented behavior: "best effort, ignore errors"
    }

    // Clear local session
    // Server-side: use Qwik cookie API to delete HttpOnly cookie
    // This is the only way to delete HttpOnly cookies (cannot be done from JavaScript)
    if (cookie && typeof cookie.delete === 'function') {
      (cookie as Cookie).delete(this.config.auth.cookieName, { path: '/' });
    }
    // Client-side: clear localStorage
    // This is handled in UserDropdown before calling the route action
    // But we clear it here too as a safety measure
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.config.auth.cookieName);
    }
  }

  /** True when Sanctum/session cookies suggest a logged-in user. */
  private hasAuthCookies(cookie?: Cookie): boolean {
    if (!cookie) {
      return false;
    }
    return !!(
      cookie.get(this.config.auth.cookieName)?.value ||
      cookie.get('laravel_session')?.value ||
      cookie.get('XSRF-TOKEN')?.value
    );
  }

  /**
   * Get current session from Laravel
   */
  async getSession(cookie?: Cookie, forwardDocumentUrl?: string | null): Promise<AuthSession | null> {
    if (typeof window === 'undefined' && !this.hasAuthCookies(cookie)) {
      return null;
    }

    const apiClient =
      forwardDocumentUrl != null && String(forwardDocumentUrl).trim() !== ''
        ? new LaravelApiClient(resolveMarketingApiBaseUrl(forwardDocumentUrl), extractCookieHeader(cookie))
        : this.apiClient;
    try {
      // Try to get from Laravel /me endpoint (protected route)
      const response = await apiClient.get<{ user: AuthSession['user'] }>('/me');

      if (response.success && response.data) {
        // Transform Laravel user data to match frontend User interface
        const laravelUser: any = response.data.user;
        const user: AuthSession['user'] = {
          id: laravelUser.id.toString(),
          email: laravelUser.email,
          name: laravelUser.name,
          avatar: laravelUser.avatar,
          // Map roles array to single role (take first role or highest priority)
          role: (laravelUser as any).role || laravelUser.roles?.[0]?.name || 'user',
          permissions: Array.isArray((laravelUser as any).permissions) ? (laravelUser as any).permissions : undefined,
          status: laravelUser.status || 'active',
          createdAt: laravelUser.created_at,
          updatedAt: laravelUser.updated_at,
        };

        const session: AuthSession = {
          user,
          token: 'sanctum_cookie',
          expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        };

        // Update cookie if provided
        if (cookie) {
          cookie.set(this.config.auth.cookieName, JSON.stringify(session), {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: import.meta.env.PROD,
            maxAge: [1, 'days'],
          });
        }

        // Also update localStorage for client-side access
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.config.auth.cookieName, JSON.stringify(session));
        }

        return session;
      }
    } catch (error: any) {
      // For 401/403 errors, still check cookie fallback
      // This is needed because after login, the cookie might be set but /me might fail
      // due to timing or token propagation issues
      // We'll check the cookie and validate it
      if (error?.status === 401 || error?.status === 403) {
        // IMPORTANT: If localStorage is empty, user has logged out - don't use cookie fallback
        // This prevents the route loader from seeing a session after logout
        if (typeof window !== 'undefined') {
          const localStorageSession = localStorage.getItem(this.config.auth.cookieName);
          if (!localStorageSession) {
            return null;
          }
        }
        
        // Check cookie fallback - if cookie exists and is valid, use it
        // This handles the case where login just succeeded but /me hasn't propagated yet
        if (cookie) {
          const sessionStr = cookie.get(this.config.auth.cookieName)?.value;
          if (sessionStr) {
            try {
              const rawSession: any = JSON.parse(sessionStr);
              // Transform user data if it's in Laravel format (has roles array)
              let user = rawSession.user;
              if (user && user.roles && Array.isArray(user.roles)) {
                user = {
                  id: user.id?.toString() || user.id,
                  email: user.email,
                  name: user.name,
                  avatar: user.avatar,
                  role: user.role || user.roles?.[0]?.name || 'user',
                  permissions: Array.isArray(user.permissions) ? user.permissions : undefined,
                  status: user.status || 'active',
                  createdAt: user.created_at || user.createdAt,
                  updatedAt: user.updated_at || user.updatedAt,
                };
              }
              const session: AuthSession = {
                ...rawSession,
                user,
              };
              // Only use cookie if it's not expired and has a valid token
              if (session.expiresAt > Date.now() && session.token && session.token !== 'sanctum_cookie') {
                return session;
              }
            } catch {
              // Invalid session format
            }
          }
        }
        // If no valid cookie, return null (user is truly not authenticated)
        return null;
      }
      
      // For other errors, log but don't throw (dev only)
      // This prevents redirect loops when API is not accessible
      if (import.meta.env.DEV) {
        console.warn('getSession API error (non-auth):', error?.message || error);
      }
    }

    // Fallback to cookie/localStorage only if API call didn't fail with auth error
    // This ensures that if token was deleted (401), we don't use stale cookie data
    if (cookie) {
      const sessionStr = cookie.get(this.config.auth.cookieName)?.value;
      if (sessionStr) {
        try {
          const rawSession: any = JSON.parse(sessionStr);
          // Transform user data if it's in Laravel format (has roles array)
          let user = rawSession.user;
          if (user && user.roles && Array.isArray(user.roles)) {
            user = {
              id: user.id?.toString() || user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              role: user.role || user.roles?.[0]?.name || 'user',
              permissions: Array.isArray(user.permissions) ? user.permissions : undefined,
              status: user.status || 'active',
              createdAt: user.created_at || user.createdAt,
              updatedAt: user.updated_at || user.updatedAt,
            };
          }
          const session: AuthSession = {
            ...rawSession,
            user,
          };
          if (session.expiresAt > Date.now()) {
            return session;
          }
        } catch {
          // Invalid session
        }
      }
    }

    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem(this.config.auth.cookieName);
      if (sessionStr) {
        try {
          const session: AuthSession = JSON.parse(sessionStr);
          if (session.expiresAt > Date.now()) {
            return session;
          }
        } catch {
          // Invalid session
        }
      }
    }

    return null;
  }

  /**
   * Refresh authentication token (not needed for Sanctum, but kept for interface compliance)
   */
  async refreshToken(cookie?: Cookie): Promise<AuthSession | null> {
    // Sanctum uses cookies, so we just refresh the CSRF token
    await this.apiClient.refreshCsrfToken();
    return this.getSession(cookie);
  }

  /**
   * Register new user with Laravel
   */
  async register(data: RegisterData, cookie?: Cookie): Promise<AuthSession | null> {
    try {
      await this.apiClient.refreshCsrfToken();

      const response = await this.apiClient.post<{
        user: AuthSession['user'];
        token?: string;
      }>('/auth/register', data);

      if (!response.success || !response.data) {
        return null;
      }

      // Auto-login after registration
      return this.login(
        { email: data.email, password: data.password },
        cookie,
      );
    } catch (error: any) {
      console.error('Laravel registration error:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(cookie?: Cookie): Promise<boolean> {
    const session = await this.getSession(cookie);
    return session !== null;
  }
}
