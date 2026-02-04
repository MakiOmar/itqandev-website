import type { User, AuthSession, LoginCredentials, RegisterData } from './types';
import { ROLES } from '../constants/roles';
import type { Cookie } from '@builder.io/qwik-city';

/**
 * Cookie name for authentication
 */
export const AUTH_COOKIE_NAME = 'auth_session';

/**
 * Mock users database
 */
const mockUsers: User[] = [
  {
    id: '1',
    email: 'superadmin@example.com',
    name: 'Super Admin',
    role: ROLES.SUPER_ADMIN,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: ROLES.ADMIN,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'user@example.com',
    name: 'Regular User',
    role: ROLES.USER,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Mock passwords (in real app, these would be hashed)
 */
const mockPasswords: Record<string, string> = {
  'superadmin@example.com': 'password123',
  'admin@example.com': 'password123',
  'user@example.com': 'password123',
};

/**
 * Generate a mock JWT token
 */
function generateToken(): string {
  return `mock_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Get session from cookie (server-side)
 */
export function getSessionFromCookie(cookie: Cookie): AuthSession | null {
  const sessionCookie = cookie.get(AUTH_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const session: AuthSession = JSON.parse(sessionCookie.value);
    if (session.expiresAt < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/**
 * Set session in cookie (server-side)
 */
export function setSessionCookie(cookie: Cookie, session: AuthSession): void {
  cookie.set(AUTH_COOKIE_NAME, JSON.stringify(session), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: [1, 'days'],
  });
}

/**
 * Clear session cookie (server-side)
 */
export function clearSessionCookie(cookie: Cookie): void {
  cookie.delete(AUTH_COOKIE_NAME, { path: '/' });
}

/**
 * Mock authentication service
 */
export const mockAuth = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials, cookie?: Cookie): Promise<AuthSession | null> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = mockUsers.find((u) => u.email === credentials.email);
    const password = mockPasswords[credentials.email];

    if (!user || password !== credentials.password) {
      return null;
    }

    if (user.status !== 'active') {
      throw new Error('Account is not active');
    }

    const session: AuthSession = {
      user,
      token: generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    // Store in cookie (server-side) or localStorage (client-side)
    if (cookie) {
      setSessionCookie(cookie, session);
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(session));
    }

    return session;
  },

  /**
   * Register a new user
   */
  async register(data: RegisterData): Promise<AuthSession> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const newUser: User = {
      id: String(mockUsers.length + 1),
      email: data.email,
      name: data.name,
      role: ROLES.USER,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);
    mockPasswords[data.email] = data.password;

    const session: AuthSession = {
      user: newUser,
      token: generateToken(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_session', JSON.stringify(session));
    }

    return session;
  },

  /**
   * Get current session from storage or cookie
   */
  getSession(cookie?: Cookie): AuthSession | null {
    // Server-side: get from cookie
    if (cookie) {
      return getSessionFromCookie(cookie);
    }

    // Client-side: get from localStorage
    if (typeof window === 'undefined') {
      return null;
    }

    const stored = localStorage.getItem('auth_session');
    if (!stored) {
      return null;
    }

    try {
      const session: AuthSession = JSON.parse(stored);
      if (session.expiresAt < Date.now()) {
        localStorage.removeItem('auth_session');
        return null;
      }
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Logout current user
   */
  logout(cookie?: Cookie): void {
    if (cookie) {
      clearSessionCookie(cookie);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_session');
    }
  },

  /**
   * Get user by ID
   */
  getUserById(id: string): User | undefined {
    return mockUsers.find((u) => u.id === id);
  },

  /**
   * Get all users (for admin)
   */
  getAllUsers(): User[] {
    return [...mockUsers];
  },

  /**
   * Update user
   */
  updateUser(id: string, updates: Partial<User>): User | null {
    const userIndex = mockUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return null;
    }

    mockUsers[userIndex] = {
      ...mockUsers[userIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return mockUsers[userIndex];
  },

  /**
   * Delete user
   */
  deleteUser(id: string): boolean {
    const userIndex = mockUsers.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      return false;
    }

    mockUsers.splice(userIndex, 1);
    return true;
  },
};
