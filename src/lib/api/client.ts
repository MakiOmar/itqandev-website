import type { ApiResponse, ApiError } from './types';
import type { Cookie } from '@builder.io/qwik-city';
import { getConfig } from '../config';
import { LaravelApiClient } from './laravel-client';

/**
 * Extract cookie header string from Qwik request context
 * Used in routeLoader$ to pass cookies to API client for server-side authentication
 * @param cookie - Qwik cookie object from routeLoader$ context
 * @param request - Request object from routeLoader$ context (has headers property)
 */
export function extractCookieHeader(cookie?: Cookie, request?: { headers: Headers }): string | null {
  if (request) {
    // Get the Cookie header directly from the request
    const cookieHeader = request.headers.get('cookie') || request.headers.get('Cookie') || null;
    return cookieHeader;
  } else if (cookie) {
    // Fallback: try to build from Qwik cookie object
    try {
      const cookieString = cookie.toString();
      return cookieString;
    } catch (e) {
      // If toString() doesn't work, try to get individual cookies
      const config = getConfig();
      const sessionCookie = cookie.get(config.auth.cookieName);
      const xsrfCookie = cookie.get('XSRF-TOKEN');
      const laravelSession = cookie.get('laravel_session');
      const cookiePairs: string[] = [];
      if (sessionCookie?.value) cookiePairs.push(`${config.auth.cookieName}=${sessionCookie.value}`);
      if (xsrfCookie?.value) cookiePairs.push(`XSRF-TOKEN=${xsrfCookie.value}`);
      if (laravelSession?.value) cookiePairs.push(`laravel_session=${laravelSession.value}`);
      if (cookiePairs.length > 0) {
        return cookiePairs.join('; ');
      }
    }
  }
  return null;
}

/**
 * API client configuration
 */
const getApiBaseUrl = () => {
  const config = getConfig();
  return config.api.baseUrl;
};

/**
 * Get auth token from storage
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const session = localStorage.getItem('auth_session');
  if (!session) {
    return null;
  }
  try {
    const parsed = JSON.parse(session);
    return parsed.token || null;
  } catch {
    return null;
  }
}

/**
 * API client class
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || getApiBaseUrl();
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = getAuthToken();
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type for non-FormData requests
    // FormData needs to set Content-Type automatically with boundary
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // 204 No Content — no response body to parse
      if (response.status === 204) {
        return {
          success: true,
          data: {} as T,
        };
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          // If not JSON, create error response
          if (!response.ok) {
            throw new Error(text || `Request failed with status ${response.status}`);
          }
          data = { data: text };
        }
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || `Request failed with status ${response.status}`;
        console.error(`API Error [${response.status}]: ${url}`, errorMessage, data);
        throw new Error(errorMessage);
      }

      // Handle Laravel API Resource format: { data: {...} }
      if (data.data !== undefined) {
        return {
          success: true,
          data: data.data as T,
        };
      }

      // Direct data format (already an array or object)
      return {
        success: true,
        data: data as T,
      };
    } catch (error: any) {
      // Log the error with more context
      if (error.message) {
        console.error(`API Request failed: ${this.baseUrl}${endpoint}`, error.message);
      } else {
        console.error(`API Request failed: ${this.baseUrl}${endpoint}`, error);
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    const isFormData = data instanceof FormData;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * Default API client instance
 * Uses standard client (not Laravel-specific)
 * For Laravel, use LaravelApiClient from './laravel-client'
 */
export const apiClient = new ApiClient();

/**
 * Get API client based on configuration
 * Returns Laravel client if Sanctum is enabled, otherwise standard client
 * @param serverCookies - Optional cookie string for server-side requests
 * @param contentPresentationLocale - Send X-Content-Locale for localized list payloads; false = never send (raw single-record fetches)
 */
export function getApiClient(serverCookies?: string | null, contentPresentationLocale?: string | false): ApiClient {
  const config = getConfig();
  if (config.api.sanctum) {
    return new LaravelApiClient(undefined, serverCookies || undefined, contentPresentationLocale) as any as ApiClient;
  }
  return apiClient;
}
