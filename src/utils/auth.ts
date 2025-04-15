import jwt from 'jsonwebtoken';
import { NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Safely verifies a JWT token and handles errors appropriately
 * @param token The JWT token to verify
 * @param res The NextApiResponse object to send errors to
 * @returns True if token is valid, false if invalid
 */
export const verifyToken = (token: string, res: NextApiResponse): boolean => {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError);
    res.status(401).json({ error: 'Invalid authentication token' });
    return false;
  }
};
