import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';

// Create mock prisma before importing routes
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  }
};

// Mock the db module
jest.unstable_mockModule('../../config/db.js', () => ({
  default: mockPrisma
}));

// Import auth routes after mocking
const { default: authRoutes } = await import('../../routes/auth.js');

// Create test app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Auth Routes', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user as first user (admin)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN'
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.role).toBe('ADMIN');
      expect(response.body).toHaveProperty('token');
    });

    it('should register a new user as staff (not first user)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-456',
        email: 'staff@example.com',
        name: 'Staff User',
        role: 'STAFF'
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'staff@example.com',
          password: 'password123',
          name: 'Staff User'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.role).toBe('STAFF');
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com'
      });

      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should require email, password, and name', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });

    it('should require email', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'STAFF',
        isActive: true
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body).toHaveProperty('token');
      // Password should not be returned
      expect(response.body.user.password).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject deactivated account', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        password: hashedPassword,
        isActive: false
      });

      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Account is deactivated');
    });

    it('should require email and password', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email and password are required');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF',
        isActive: true
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      // Generate a valid token
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual(user);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('PUT /auth/change-password', () => {
    it('should change password with correct current password', async () => {
      const hashedPassword = await bcrypt.hash('currentpassword', 12);
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'STAFF',
        isActive: true
      };

      // Mock for authenticate middleware
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user) // For authenticate
        .mockResolvedValueOnce(user); // For change-password route
      mockPrisma.user.update.mockResolvedValue({ ...user });

      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'currentpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password changed successfully');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject incorrect current password', async () => {
      const hashedPassword = await bcrypt.hash('currentpassword', 12);
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'STAFF',
        isActive: true
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user) // For authenticate
        .mockResolvedValueOnce(user); // For change-password route

      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should require current and new password', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'STAFF',
        isActive: true
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .put('/auth/change-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'currentpassword'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Current and new password are required');
    });
  });
});
