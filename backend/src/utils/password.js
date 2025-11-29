import crypto from 'crypto';

/**
 * Hash password using SHA-256 (simple hashing for demo)
 * In production, use bcrypt or argon2
 */
export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Verify password
 */
export function verifyPassword(password, hashedPassword) {
  const hash = hashPassword(password);
  return hash === hashedPassword;
}

