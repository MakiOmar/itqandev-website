import type { ApiResponse, ApiError } from './types';
import { getConfig } from '../config';
import { readPreferredLocaleFromCookieHeader } from '../i18n/dashboard-locale';
import { ensureSsrIpv4First } from '../marketing/ssr-dns';
import { ssrFetch } from '../marketing/ssr-fetch';

/**
 * Laravel-specific API client
 * Handles CSRF tokens, Sanctum authentication, and Laravel error formats
 */
export class LaravelApiClient {
  private baseUrl: string;
  private csrfToken: string | null = null;
  private sanctum: boolean;
  private serverCookies: string | null = null; // For server-side requests
  /** When false, never send X-Content-Locale (raw translatable fields). When string, force that locale. Otherwise infer from cookie/localStorage. */
  private contentPresentationLocale: string | false | undefined;

  constructor(baseUrl?: string, serverCookies?: string, contentPresentationLocale?: string | false) {
    const config = getConfig();
    this.baseUrl = baseUrl || config.api.baseUrl;
    this.sanctum = config.api.sanctum || false;
    this.serverCookies = serverCookies || null;
    this.contentPresentationLocale = contentPresentationLocale;
    this.loadCsrfToken();
  }

  private getContentPresentationLocaleForRequest(): string | null {
    if (this.contentPresentationLocale === false) {
      return null;
    }
    if (typeof this.contentPresentationLocale === 'string' && this.contentPresentationLocale.trim() !== '') {
      return this.contentPresentationLocale.trim();
    }
    const fromCookie = readPreferredLocaleFromCookieHeader(this.serverCookies);
    if (fromCookie) {
      return fromCookie;
    }
    if (typeof localStorage !== 'undefined') {
      const ls = localStorage.getItem('preferred-locale');
      if (ls && ls.trim()) {
        return ls.trim();
      }
    }
    return null;
  }

  /**
   * Load CSRF token from meta tag or cookie
   */
  private loadCsrfToken(): void {
    if (typeof window === 'undefined') return;

    // Try to get from meta tag (Laravel's default)
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      this.csrfToken = metaTag.getAttribute('content');
      return;
    }

    // Try to get from cookie (XSRF-TOKEN)
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'XSRF-TOKEN') {
        this.csrfToken = decodeURIComponent(value);
        return;
      }
    }
  }

  /**
   * Get CSRF token (refresh if needed)
   */
  private async getCsrfToken(): Promise<string | null> {
    if (!this.csrfToken) {
      this.loadCsrfToken();
    }
    return this.csrfToken;
  }

  /**
   * Get authentication credentials
   * For Sanctum, we rely on cookies; for token-based, we get from storage or server cookies
   */
  private getAuthHeaders(): Record<string, string> {
    const config = getConfig();
    const headers: Record<string, string> = {};

    // Try to get token from various sources
    let token: string | null = null;

    if (typeof window !== 'undefined') {
      // Client-side: check localStorage first
      const session = localStorage.getItem(config.auth.cookieName);
      if (session) {
        try {
          const parsed = JSON.parse(session);
          // Only use token if it's not the placeholder
          if (parsed.token && parsed.token !== 'sanctum_cookie') {
            // Sanctum tokens don't expire by default (expiration: null in config)
            // Use the token if it exists - let the server reject it if truly invalid
            // This fixes the issue where valid tokens are rejected due to stale expiresAt
            token = parsed.token;
          }
          // Token is 'sanctum_cookie' - rely on cookie-based auth, don't send Bearer token
          // This will be handled by credentials: 'include' in the request
        } catch {
          // Invalid session, try as plain token
          if (session && session !== 'sanctum_cookie') {
            token = session;
          }
        }
      }
    } else {
      // Server-side: try to get token from server cookies
      token = this.getTokenFromServerCookies();
    }

    // If we have a token, use it as Bearer token
    if (token) {
      headers[config.auth.tokenHeader] = `Bearer ${token}`;
    }

    // Always set X-Requested-With for CORS (required by Laravel Sanctum)
    headers['X-Requested-With'] = 'XMLHttpRequest';

    return headers;
  }

  /**
   * Extract token from server cookies (auth_session cookie contains JSON with token)
   */
  private getTokenFromServerCookies(): string | null {
    if (!this.serverCookies) {
      return null;
    }

    try {
      const config = getConfig();
      // Parse cookies to find auth_session
      const cookies = this.serverCookies.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === config.auth.cookieName && value) {
          // Decode URL-encoded value if needed
          const decodedValue = decodeURIComponent(value);
          try {
            const session = JSON.parse(decodedValue);
            // Check if token exists and is not the placeholder
            if (session.token && session.token !== 'sanctum_cookie') {
              return session.token;
            }
          } catch {
            // Not JSON, try as-is
            if (value && value !== 'sanctum_cookie') {
              return value;
            }
          }
        }
      }
    } catch {
      // Failed to parse cookies
    }

    return null;
  }

  /**
   * Get cookie header for server-side requests
   */
  private getCookieHeader(): string | null {
    // If serverCookies were provided (server-side), use them
    if (this.serverCookies) {
      return this.serverCookies;
    }
    
    // Otherwise, try to get from browser (client-side)
    if (typeof document !== 'undefined') {
      return document.cookie || null;
    }
    
    return null;
  }

  /**
   * Handle Laravel error response format
   */
  private handleLaravelError(response: Response, data: any): ApiError {
    // Laravel validation errors
    if (response.status === 422 && data.errors) {
      return {
        message: data.message || 'Validation failed',
        errors: data.errors,
        status: 422,
      };
    }

    // Laravel API resource errors
    if (data.error || data.message) {
      return {
        message: data.message || data.error || 'Request failed',
        status: response.status,
      };
    }

    // Generic error
    return {
      message: data.message || `Request failed with status ${response.status}`,
      status: response.status,
    };
  }

  /**
   * Upload FormData using XMLHttpRequest (more reliable for file uploads)
   */
  private async uploadFormData<T>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    // Get CSRF token first (async)
    let csrfToken = await this.getCsrfToken();
    const authHeaders = this.getAuthHeaders();
    const config = getConfig();
    const hasBearerToken = !!authHeaders[config.auth.tokenHeader] &&
                          authHeaders[config.auth.tokenHeader].startsWith('Bearer ');
    
    // If we're using Sanctum cookie auth and there's no CSRF token yet, fetch it
    if (this.sanctum && !hasBearerToken && !csrfToken) {
      await this.refreshCsrfToken();
      csrfToken = await this.getCsrfToken();
    }
    
    if (import.meta.env.DEV) {
      console.debug('[Media Upload] CSRF Debug', {
        endpoint,
        sanctum: this.sanctum,
        hasBearerToken,
        csrfTokenPresent: !!csrfToken,
        xsrfCookiePresent: typeof document !== 'undefined' ? document.cookie.includes('XSRF-TOKEN=') : false,
        laravelSessionPresent: typeof document !== 'undefined' ? document.cookie.includes('laravel_session=') : false,
      });
    }
    
    return new Promise((resolve, reject) => {
      if (typeof XMLHttpRequest === 'undefined') {
        // Fallback to fetch if XMLHttpRequest is not available (e.g., server-side)
        return this.request<T>(endpoint, { ...options, method: 'POST', body: formData });
      }

      const url = `${this.baseUrl}${endpoint}`;
      const xhr = new XMLHttpRequest();

      // Set up event handlers
      xhr.onload = () => {
        const contentType = xhr.getResponseHeader('content-type');
        let data: any;

        // 204 No Content — no body (201 parses below when present)
        if (xhr.status === 204) {
          return resolve({
            success: true,
            data: {} as T,
          });
        }

        // Parse JSON response
        if (contentType && contentType.includes('application/json')) {
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = { message: xhr.responseText || 'Unknown error' };
          }
        } else {
          try {
            data = JSON.parse(xhr.responseText);
          } catch {
            data = { message: xhr.responseText || 'Unknown error' };
          }
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            success: true,
            data: data.data || data,
          });
        } else {
          // Handle Laravel error format
          const error = this.handleLaravelError(
            new Response(xhr.responseText, { status: xhr.status }),
            data,
          );
          reject(error);
        }
      };

      xhr.onerror = () => {
        reject({
          message: 'Network error',
          status: xhr.status || 0,
        });
      };

      xhr.ontimeout = () => {
        reject({
          message: 'Request timeout',
          status: 408,
        });
      };

      // Open request
      const method = options.method || 'POST';
      xhr.open(method, url, true);
      // Include cookies for Sanctum cookie-based auth
      xhr.withCredentials = this.sanctum;

      // Set headers (XMLHttpRequest automatically sets Content-Type with boundary for FormData)
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      const presentLocale = this.getContentPresentationLocaleForRequest();
      if (presentLocale) {
        xhr.setRequestHeader('X-Content-Locale', presentLocale);
      }

      // Add Authorization header if available
      if (authHeaders[config.auth.tokenHeader]) {
        xhr.setRequestHeader(config.auth.tokenHeader, authHeaders[config.auth.tokenHeader]);
      }

      // Add CSRF token if needed (only if no Bearer token)
      const hasBearerToken = !!authHeaders[config.auth.tokenHeader] &&
                            authHeaders[config.auth.tokenHeader].startsWith('Bearer ');
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken && !hasBearerToken) {
        xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
      }
      
      if (import.meta.env.DEV) {
        console.debug('[Media Upload] XHR Headers', {
          method,
          withCredentials: xhr.withCredentials,
          sentCsrfHeader: !!csrfToken && !hasBearerToken,
        });
      }

      // Add custom headers from options
      if (options.headers) {
        const headers = options.headers as Record<string, string>;
        for (const [key, value] of Object.entries(headers)) {
          // Skip Content-Type - XMLHttpRequest will set it automatically for FormData
          if (key.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(key, value);
          }
        }
      }

      // CRITICAL: Do NOT set Content-Type header - XMLHttpRequest will set it automatically
      // with the correct boundary for FormData

      // Set timeout if specified
      if (options.signal) {
        options.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Send FormData (XMLHttpRequest will automatically set Content-Type: multipart/form-data; boundary=...)
      xhr.send(formData);
    });
  }

  /**
   * Make HTTP request with Laravel-specific handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    if (typeof window === 'undefined') {
      await ensureSsrIpv4First();
    }
    const config = getConfig();
    const url = `${this.baseUrl}${endpoint}`;

    // Get CSRF token for state-changing requests (only if not using Bearer token)
    const csrfToken = await this.getCsrfToken();
    const authHeaders = this.getAuthHeaders();
    
    // Check if we have a Bearer token - if so, we don't need CSRF
    const hasBearerToken = !!authHeaders[config.auth.tokenHeader] && 
                          authHeaders[config.auth.tokenHeader].startsWith('Bearer ');

    // Check if body is FormData - must check before building headers
    const isFormData = options.body instanceof FormData;
    
    // Build headers, excluding Content-Type for FormData (browser sets it automatically with boundary)
    // CRITICAL: Remove Content-Type from config headers if FormData
    const configHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(config.api.headers || {})) {
      // Skip Content-Type header for FormData - browser will set it with boundary
      if (isFormData && key.toLowerCase() === 'content-type') {
        continue; // Skip this header
      }
      configHeaders[key] = value;
    }
    
    // Build headers, but exclude Content-Type from options.headers if FormData
    const optionsHeaders = { ...(options.headers as Record<string, string> || {}) };
    if (isFormData && optionsHeaders['Content-Type']) {
      delete optionsHeaders['Content-Type'];
    }
    if (isFormData && optionsHeaders['content-type']) {
      delete optionsHeaders['content-type'];
    }
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...configHeaders,
      ...authHeaders,
      ...optionsHeaders,
    };

    const presentLocale = this.getContentPresentationLocaleForRequest();
    if (presentLocale) {
      headers['X-Content-Locale'] = presentLocale;
    }

    // Only set Content-Type for non-FormData requests
    // FormData needs to set Content-Type automatically with boundary
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    
    // CRITICAL: Ensure Content-Type is NOT set for FormData
    // The browser MUST set it automatically with the correct boundary
    if (isFormData) {
      // Remove Content-Type if it exists - browser will set it with boundary
      // Check all possible case variations
      delete headers['Content-Type'];
      delete headers['content-type'];
      delete headers['CONTENT-TYPE'];
      delete (headers as any)['Content-Type'];
      delete (headers as any)['content-type'];
      delete (headers as any)['CONTENT-TYPE'];
      
      // Also ensure it's not in the final headers object
      const headerKeys = Object.keys(headers);
      for (const key of headerKeys) {
        if (key.toLowerCase() === 'content-type') {
          delete headers[key];
        }
      }
    }

    // Add CSRF token for POST, PUT, PATCH, DELETE
    // BUT: Skip CSRF if we have a Bearer token (token-based auth doesn't need CSRF)
    const method = options.method || 'GET';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken && !hasBearerToken) {
      headers['X-CSRF-TOKEN'] = csrfToken;
    }

    // For server-side requests, check if we're using token-based auth
    // If token is already in headers (from getAuthHeaders), we don't need cookies
    const hasTokenHeader = !!headers[config.auth.tokenHeader];
    
    // For server-side requests with Sanctum cookie-based auth, we need to manually set the Cookie header
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader && this.sanctum && typeof window === 'undefined' && !hasTokenHeader) {
      headers['Cookie'] = cookieHeader;
    }
    
    // For client-side requests with Sanctum, always include cookies via credentials: 'include'
    // This ensures cookie-based auth works even if Bearer token is missing or invalid
    // The credentials setting is already handled below in requestOptions

    // Build request options, preserving all original options but overriding headers and credentials
    // CRITICAL: For FormData, we must NOT set Content-Type header - browser will set it with boundary
    // We explicitly build requestOptions to ensure FormData body is preserved and headers are correct
    // IMPORTANT: Do NOT spread options - we need full control over headers for FormData
    const requestOptions: RequestInit = {
      method: options.method,
      body: options.body, // Preserve body (especially important for FormData)
      credentials: this.sanctum ? 'include' : 'same-origin', // Include cookies for Sanctum (client-side)
    };
    
    // Set headers - but for FormData, ensure Content-Type is completely absent
    // The browser will automatically set Content-Type with boundary for FormData
    // CRITICAL: Do NOT set Content-Type header for FormData - browser MUST set it
    if (isFormData) {
      // For FormData, create a plain object without Content-Type
      // We need other headers (Authorization, Accept, etc.) but NOT Content-Type
      // Using a plain object (not Headers) allows fetch to automatically add Content-Type with boundary
      const formDataHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        // Skip Content-Type completely for FormData - browser will set it with boundary
        if (key.toLowerCase() !== 'content-type') {
          formDataHeaders[key] = value;
        }
      }
      // Set headers as plain object - fetch will automatically add Content-Type with boundary
      requestOptions.headers = formDataHeaders;
      // CRITICAL: Do NOT set Content-Type - fetch MUST handle it automatically
      // When you pass a plain object (without Content-Type) to fetch with FormData,
      // fetch will automatically add: multipart/form-data; boundary=...
    } else {
      // For non-FormData, use regular headers object
      requestOptions.headers = headers;
    }
    
    // Preserve other options like signal, cache, etc. but exclude headers and body (already set)
    if (options.signal) requestOptions.signal = options.signal;
    if (options.cache) requestOptions.cache = options.cache;
    if (options.mode) requestOptions.mode = options.mode;
    if (options.redirect) requestOptions.redirect = options.redirect;
    if (options.referrer) requestOptions.referrer = options.referrer;
    if (options.referrerPolicy) requestOptions.referrerPolicy = options.referrerPolicy;
    if (options.integrity) requestOptions.integrity = options.integrity;
    if (options.keepalive !== undefined) requestOptions.keepalive = options.keepalive;
    
    try {
      const response = await ssrFetch(url, requestOptions);
      const contentType = response.headers.get('content-type');

      // 204 No Content — no response body to parse
      if (response.status === 204) {
        return {
          success: true,
          data: {} as T,
        };
      }

      // Parse JSON response (201 Created often includes a resource body from Laravel)
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text || 'Unknown error' };
        }
      }

      if (!response.ok) {
        throw this.handleLaravelError(response, data);
      }

      // Handle Laravel paginated response: { data: [...], links: {...}, meta: {...} }
      // For paginated responses, we want to return the entire structure so the frontend can access data, links, and meta
      if (data.data !== undefined && Array.isArray(data.data) && (data.links || data.meta)) {
        // This is a paginated response - return the entire structure
        // Frontend can access projects via response.data.data
        return {
          success: true,
          data: data as T,
        };
      }

      // Laravel API Resource format: { data: {...} } (single resource)
      if (data.data !== undefined && !Array.isArray(data.data)) {
        return {
          success: true,
          data: data.data as T,
        };
      }

      // Direct data format (array or object)
      return {
        success: true,
        data: data as T,
      };
    } catch (error: any) {
      if (error.status) {
        // Already formatted as ApiError
        throw error;
      }
      throw {
        message: error.message || 'Network error',
        status: 0,
      } as ApiError;
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
    
    // For FormData, use XMLHttpRequest (more reliable for file uploads)
    if (isFormData && typeof XMLHttpRequest !== 'undefined') {
      return this.uploadFormData<T>(endpoint, data, { method: 'POST' });
    }
    
    // For other data, use regular fetch
    const body = isFormData ? data : (data !== undefined ? JSON.stringify(data) : undefined);
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
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

  /**
   * Refresh CSRF token (call before login)
   * Sanctum CSRF cookie endpoint is at /sanctum/csrf-cookie (not under /api)
   */
  async refreshCsrfToken(): Promise<void> {
    try {
      // Extract base URL without /api suffix for Sanctum endpoint
      const sanctumBaseUrl = this.baseUrl.replace(/\/api\/?$/, '');
      const csrfUrl = `${sanctumBaseUrl}/sanctum/csrf-cookie`;
      const response = await ssrFetch(csrfUrl, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        this.loadCsrfToken();
      }
    } catch {
      // Ignore errors
    }
  }
}
