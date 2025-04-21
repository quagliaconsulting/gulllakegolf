import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { getToken } from 'next-auth/jwt';
import { 
  sendAuthError, 
  sendError,
  ApiResponse 
} from './apiResponse';

// User roles enum
export enum UserRole {
  ADMIN = 'ADMIN',
  TEAM_CAPTAIN = 'TEAM_CAPTAIN',
  PLAYER = 'PLAYER'
}

// JwtPayload interface
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  name?: string;
  iat: number;
  exp: number;
}

// Session user interface
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

/**
 * Authentication service class
 */
export class AuthService {
  /**
   * Get the JWT secret
   */
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.warn('WARNING: JWT_SECRET or NEXTAUTH_SECRET is not defined in environment variables');
    }
    return secret || 'local-development-secret';
  }

  /**
   * Generate a JWT token for the user
   */
  static generateToken(userId: string, email: string, role: string, name?: string): string {
    return jwt.sign(
      { userId, email, role, name },
      this.getJwtSecret(),
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as JwtPayload;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Extract the token from the request
   */
  static getTokenFromRequest(req: NextApiRequest): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    if (req.cookies?.token) {
      return req.cookies.token;
    }
    
    return null;
  }

  /**
   * Middleware to authenticate requests
   * Returns the payload if authenticated, otherwise sends an error response
   */
  static authenticate(
    req: NextApiRequest, 
    res: NextApiResponse<ApiResponse>
  ): JwtPayload | null {
    const token = this.getTokenFromRequest(req);
    
    if (!token) {
      sendAuthError(res, 'Authentication required');
      return null;
    }
    
    const payload = this.verifyToken(token);
    
    if (!payload) {
      sendAuthError(res, 'Invalid or expired token');
      return null;
    }
    
    return payload;
  }

  /**
   * Get user from session (supports both NextAuth and custom JWT)
   */
  static async getSessionUser(req: NextApiRequest): Promise<SessionUser | null> {
    try {
      // First try NextAuth session
      const nextAuthToken = await getToken({ req });
      if (nextAuthToken) {
        return {
          id: nextAuthToken.id as string || nextAuthToken.sub as string,
          name: nextAuthToken.name as string,
          email: nextAuthToken.email as string,
          role: nextAuthToken.role as UserRole || UserRole.PLAYER
        };
      }
      
      // Then try manual JWT token
      const token = this.getTokenFromRequest(req);
      if (!token) {
        return null;
      }
      
      const payload = this.verifyToken(token);
      if (!payload) {
        return null;
      }
      
      return {
        id: payload.userId,
        name: payload.name || '',
        email: payload.email,
        role: payload.role as UserRole
      };
    } catch (error) {
      console.error('Failed to get session user:', error);
      return null;
    }
  }
  
  /**
   * Check if user has required role
   */
  static hasRole(user: SessionUser | null, requiredRoles: UserRole | UserRole[]): boolean {
    if (!user) return false;
    
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    
    return user.role === requiredRoles;
  }
  
  /**
   * Middleware to protect API routes by role
   */
  static async requireAuth(
    req: NextApiRequest, 
    res: NextApiResponse, 
    requiredRoles?: UserRole | UserRole[]
  ): Promise<SessionUser | null> {
    // Check authentication first
    const user = await this.getSessionUser(req);
    
    if (!user) {
      sendAuthError(res, 'Authentication required');
      return null;
    }
    
    // If no specific roles required, just check authentication
    if (!requiredRoles) {
      return user;
    }
    
    // Check user has required role
    if (!this.hasRole(user, requiredRoles)) {
      sendError(res, 'Insufficient permissions', 403);
      return null;
    }
    
    return user;
  }
  
  /**
   * Check if user is admin
   */
  static isAdmin(user: SessionUser | null): boolean {
    return this.hasRole(user, UserRole.ADMIN);
  }
  
  /**
   * Check if user is team captain
   */
  static isTeamCaptain(user: SessionUser | null): boolean {
    return this.hasRole(user, UserRole.TEAM_CAPTAIN);
  }
  
  /**
   * Check if user is player
   */
  static isPlayer(user: SessionUser | null): boolean {
    return this.hasRole(user, UserRole.PLAYER);
  }
}