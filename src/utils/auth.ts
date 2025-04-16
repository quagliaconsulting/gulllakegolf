import jwt from 'jsonwebtoken';
import { NextApiResponse } from 'next';

// Ensure JWT_SECRET is loaded (important!)
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Safely verifies a JWT token and handles errors appropriately
 * @param token The JWT token string (without 'Bearer ')
 * @param res The NextApiResponse object to send errors to
 * @returns True if token is valid, false if invalid
 */
export const verifyToken = (token: string | undefined, res: NextApiResponse): boolean => {
  // Remove the logic that checks for 'Bearer ' prefix, 
  // as the caller should provide only the token string now.
  /*
  let token: string | undefined = undefined;
  if (authHeaderOrToken && authHeaderOrToken.startsWith('Bearer ')) {
    token = authHeaderOrToken.substring(7);
  } else {
    token = authHeaderOrToken; 
  }
  */

  // --- Enhanced Logging --- 
  console.log('--- verifyToken --- ');
  // console.log('Raw authHeaderOrToken received:', authHeaderOrToken); // No longer relevant
  console.log('Token string received (first 10): ', token?.substring(0, 10));
  console.log('Token string received (last 10): ', token?.slice(-10));
  console.log('JWT_SECRET from process.env:', JWT_SECRET);
  // --- End Enhanced Logging ---

  if (!token) {
    console.error('Token verification failed: No token provided to verifyToken utility.');
    res?.status(401).json({ error: 'Authentication required: No token provided' });
    return false;
  }

  if (!JWT_SECRET) {
    console.error('Token verification failed: JWT_SECRET is not defined on the server.');
    res?.status(500).json({ error: 'Server configuration error: JWT_SECRET is missing.' });
    return false;
  }

  try {
    jwt.verify(token, JWT_SECRET);
    console.log('Token verification successful.'); // Add success log
    return true;
  } catch (tokenError) {
    console.error('Token verification failed:', tokenError); 
    res?.status(401).json({ error: 'Authentication required: Invalid or expired token' });
    return false;
  }
};
