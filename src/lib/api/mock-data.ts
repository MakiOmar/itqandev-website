import type { User } from '../auth/types';
import { ROLES } from '../constants/roles';

/**
 * Mock data for development
 */

// Mock users (extended list)
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'superadmin@example.com',
    name: 'Super Admin',
    role: ROLES.SUPER_ADMIN,
    status: 'active',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: ROLES.ADMIN,
    status: 'active',
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'user@example.com',
    name: 'Regular User',
    role: ROLES.USER,
    status: 'active',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '4',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: ROLES.USER,
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '5',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: ROLES.USER,
    status: 'inactive',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock activity logs
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const mockActivityLogs: ActivityLog[] = [
  {
    id: '1',
    userId: '2',
    userName: 'Admin User',
    action: 'user.created',
    resource: 'User',
    resourceId: '4',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: '1',
    userName: 'Super Admin',
    action: 'settings.updated',
    resource: 'Settings',
    ipAddress: '192.168.1.2',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: '3',
    userName: 'Regular User',
    action: 'profile.updated',
    resource: 'Profile',
    ipAddress: '192.168.1.3',
    userAgent: 'Mozilla/5.0...',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock notifications
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export const mockNotifications: Notification[] = [
  {
    id: '1',
    userId: '1',
    title: 'New User Registered',
    message: 'A new user has registered in the system',
    type: 'info',
    read: false,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    userId: '1',
    title: 'System Update',
    message: 'System maintenance scheduled for tonight',
    type: 'warning',
    read: false,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    userId: '1',
    title: 'Profile Updated',
    message: 'Your profile has been successfully updated',
    type: 'success',
    read: true,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock dashboard stats
export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  totalOrders: number;
  growthRate: number;
}

export const mockDashboardStats: DashboardStats = {
  totalUsers: 1250,
  activeUsers: 980,
  totalRevenue: 125000,
  totalOrders: 3420,
  growthRate: 12.5,
};
