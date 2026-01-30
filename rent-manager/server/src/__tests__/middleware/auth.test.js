import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import jwt from 'jsonwebtoken';
import {
  generateTestToken,
  generateExpiredToken,
  generateInvalidToken,
  generateWrongSecretToken,
  createUserFixture,
  createAdminFixture,
  createStaffFixture
} from '../helpers/index.js';

// Create mock prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  }
};

// Mock the db module before importing the middleware
jest.unstable_mockModule('../../config/db.js', () => ({
  default: mockPrisma
}));

// Import after mocking
const { authenticate, requireAdmin, requireStaffOrAdmin } = await import('../../middleware/auth.js');

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    it('should reject request without authorization header', async () => {
      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', async () => {
      mockReq.headers.authorization = 'NotBearer token';

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access token required' });
    });

    it('should reject request with invalid token', async () => {
      mockReq.headers.authorization = `Bearer ${generateInvalidToken()}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should reject request with expired token', async () => {
      const user = createUserFixture();
      mockReq.headers.authorization = `Bearer ${generateExpiredToken(user)}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Token expired' });
    });

    it('should reject request with wrong secret token', async () => {
      const user = createUserFixture();
      mockReq.headers.authorization = `Bearer ${generateWrongSecretToken(user)}`;

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });

    it('should reject request when user not found', async () => {
      const user = createUserFixture();
      mockReq.headers.authorization = `Bearer ${generateTestToken(user)}`;
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found or inactive' });
    });

    it('should reject request when user is inactive', async () => {
      const user = createUserFixture({ isActive: false });
      mockReq.headers.authorization = `Bearer ${generateTestToken(user)}`;
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'User not found or inactive' });
    });

    it('should authenticate valid token and set user on request', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF',
        isActive: true
      };
      mockReq.headers.authorization = `Bearer ${generateTestToken(user)}`;
      mockPrisma.user.findUnique.mockResolvedValue(user);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockReq.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should pass other errors to next middleware', async () => {
      const user = createUserFixture();
      mockReq.headers.authorization = `Bearer ${generateTestToken(user)}`;
      const error = new Error('Database error');
      error.name = 'SomeOtherError'; // Not JWT error
      mockPrisma.user.findUnique.mockRejectedValue(error);

      await authenticate(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin users', () => {
      mockReq.user = createAdminFixture();

      requireAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject staff users', () => {
      mockReq.user = createStaffFixture();

      requireAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireStaffOrAdmin', () => {
    it('should allow admin users', () => {
      mockReq.user = createAdminFixture();

      requireStaffOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow staff users', () => {
      mockReq.user = createStaffFixture();

      requireStaffOrAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject users with other roles', () => {
      mockReq.user = createUserFixture({ role: 'VIEWER' });

      requireStaffOrAdmin(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
