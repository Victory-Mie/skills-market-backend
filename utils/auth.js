// Auth Utilities
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} - Decoded token or null
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Generate JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token expiration time
 * @returns {string} - JWT token
 */
export function generateToken(payload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
