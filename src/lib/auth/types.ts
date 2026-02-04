import type { Role } from '../constants/roles';

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: Role;
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
