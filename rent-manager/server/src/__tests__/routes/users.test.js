import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Create mock prisma before importing routes
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
};

// Mock the db module
jest.unstable_mockModule('../../config/db.js', () => ({
  default: mockPrisma
}));

// Import routes after mocking
const { default: userRoutes } = await import('../../routes/users.js');

// Helper to create authenticated request
const createAuthToken = (user) => {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

const adminUser = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  isActive: true
};

const staffUser = {
  id: 'staff-123',
  email: 'staff@example.com',
  name: 'Staff User',
  role: 'STAFF',
  isActive: true
};

// Create test app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/users', userRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Users Routes', () => {
  let app;
  let adminToken;
  let staffToken;

  beforeAll(() => {
    app = createApp();
    adminToken = createAuthToken(adminUser);
    staffToken = createAuthToken(staffUser);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /users', () => {
    it('should return all users for admin', async () => {
      const users = [adminUser, staffUser];
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.findMany.mockResolvedValue(users);

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);

      const response = await request(app)
        .get('/users')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/users');

      expect(response.status).toBe(401);
    });
  });

  describe('POST /users', () => {
    it('should create a new user for admin', async () => {
      const newUser = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
        role: 'STAFF'
      };
      const createdUser = {
        id: 'new-user-123',
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        isActive: true,
        createdAt: new Date()
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(newUser.email);
      expect(response.body.name).toBe(newUser.name);
    });

    it('should reject duplicate email', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(adminUser)
        .mockResolvedValueOnce({ id: 'existing', email: 'existing@example.com' });

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Test User'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email already registered');
    });

    it('should require email, password, and name', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const response = await request(app)
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email, password, and name are required');
    });
  });

  describe('PUT /users/:id', () => {
    it('should update user for admin', async () => {
      const updatedUser = {
        ...staffUser,
        name: 'Updated Name',
        role: 'ADMIN'
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const response = await request(app)
        .put('/users/staff-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('User not found');
      error.code = 'P2025';
      mockPrisma.user.update.mockRejectedValue(error);

      const response = await request(app)
        .put('/users/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should delete user for admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.user.delete.mockResolvedValue(staffUser);

      const response = await request(app)
        .delete('/users/staff-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');
    });

    it('should prevent self-deletion', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const response = await request(app)
        .delete('/users/admin-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot delete your own account');
    });

    it('should return 404 for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('User not found');
      error.code = 'P2025';
      mockPrisma.user.delete.mockRejectedValue(error);

      const response = await request(app)
        .delete('/users/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('User not found');
    });
  });

  describe('GET /users/staff', () => {
    it('should return staff members for authenticated users', async () => {
      const staff = [staffUser];
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.user.findMany.mockResolvedValue(staff);

      const response = await request(app)
        .get('/users/staff')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/users/staff');

      expect(response.status).toBe(401);
    });
  });
});
