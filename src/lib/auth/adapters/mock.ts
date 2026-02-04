import type { AuthAdapter } from './base';
import type { AuthSession, LoginCredentials, RegisterData } from '../types';
import type { Cookie } from '@builder.io/qwik-city';
import { ROLES } from '../../constants/roles';
import { AUTH_COOKIE_NAME, getSessionFromCookie, setSessionCookie } from '../mock-auth';

/**
 * Mock authentication adapter
 * For development and testing purposes
 */
export class MockAuthAdapter implements AuthAdapter {
  private mockUsers = [
    {
      id: '1',
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: ROLES.SUPER_ADMIN,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: ROLES.ADMIN,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      email: 'user@example.com',
      name: 'Regular User',
      role: ROLES.USER,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  private mockPasswords: Record<string, string> = {
    'superadmin@example.com': 'password123',
    'admin@example.com': 'password123',
    'user@example.com': 'password123',
  };

  private generateToken(): string {
    return `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  async login(credentials: LoginCredentials, cookie?: Cookie): Promise<AuthSession | null> {
    const user = this.mockUsers.find((u) => u.email === credentials.email);
    const password = this.mockPasswords[credentials.email];

    if (!user || password !== credentials.password) {
      return null;
    }

    const session: AuthSession = {
      user,
      token: this.generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    if (cookie) {
      setSessionCookie(cookie, session);
    }

    return session;
  }

  async logout(cookie?: Cookie, request?: { headers: Headers }): Promise<void> {
    if (cookie) {
      cookie.delete(AUTH_COOKIE_NAME, { path: '/' });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_COOKIE_NAME);
    }
  }

  async getSession(cookie?: Cookie): Promise<AuthSession | null> {
    if (cookie) {
      return getSessionFromCookie(cookie);
    }
    
    if (typeof window !== 'undefined') {
      const sessionStr = localStorage.getItem(AUTH_COOKIE_NAME);
      if (!sessionStr) return null;
      try {
        const session: AuthSession = JSON.parse(sessionStr);
        if (session.expiresAt < Date.now()) {
          return null;
        }
        return session;
      } catch {
        return null;
      }
    }
    
    return null;
  }

  async isAuthenticated(cookie?: Cookie): Promise<boolean> {
    const session = await this.getSession(cookie);
    return session !== null;
  }

  async register(data: RegisterData, cookie?: Cookie): Promise<AuthSession | null> {
    // Mock registration - just create a user and log them in
    const newUser = {
      id: String(this.mockUsers.length + 1),
      email: data.email,
      name: data.name,
      role: ROLES.USER,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockUsers.push(newUser);
    this.mockPasswords[data.email] = data.password;

    return this.login({ email: data.email, password: data.password }, cookie);
  }
}
