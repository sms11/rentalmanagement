import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

/**
 * Generate a valid JWT token for testing
 * @param {Object} user - User object with id, email, name, role
 * @param {Object} options - JWT options (expiresIn, etc.)
 * @returns {string} JWT token
 */
export const generateTestToken = (user, options = {}) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || '1h',
    ...options
  });
};

/**
 * Generate an expired JWT token for testing
 * @param {Object} user - User object
 * @returns {string} Expired JWT token
 */
export const generateExpiredToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '-1h' // Already expired
  });
};

/**
 * Generate an invalid JWT token
 * @returns {string} Invalid JWT token
 */
export const generateInvalidToken = () => {
  return 'invalid.token.string';
};

/**
 * Generate a token signed with wrong secret
 * @param {Object} user - User object
 * @returns {string} JWT token signed with wrong secret
 */
export const generateWrongSecretToken = (user) => {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, 'wrong-secret', {
    expiresIn: '1h'
  });
};

/**
 * Create authorization header
 * @param {string} token - JWT token
 * @returns {Object} Headers object with Authorization
 */
export const createAuthHeader = (token) => ({
  Authorization: `Bearer ${token}`
});
