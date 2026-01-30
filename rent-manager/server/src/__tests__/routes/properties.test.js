import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';

// Create mock prisma before importing routes
const mockPrisma = {
  user: {
    findUnique: jest.fn()
  },
  property: {
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
const { default: propertyRoutes } = await import('../../routes/properties.js');

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

const mockProperty = {
  id: 'property-123',
  name: 'Test Property',
  address: '123 Test Street',
  description: 'A test property',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Create test app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/properties', propertyRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Properties Routes', () => {
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

  describe('GET /properties', () => {
    it('should return all active properties with tenant count', async () => {
      const properties = [
        { ...mockProperty, _count: { tenants: 2 } },
        { ...mockProperty, id: 'property-456', name: 'Another Property', _count: { tenants: 1 } }
      ];
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.property.findMany.mockResolvedValue(properties);

      const response = await request(app)
        .get('/properties')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].tenantCount).toBe(2);
      expect(response.body[0]._count).toBeUndefined();
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/properties');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /properties/:id', () => {
    it('should return property with tenants', async () => {
      const propertyWithTenants = {
        ...mockProperty,
        tenants: [
          { id: 'tenant-1', name: 'Tenant 1' },
          { id: 'tenant-2', name: 'Tenant 2' }
        ]
      };
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.property.findUnique.mockResolvedValue(propertyWithTenants);

      const response = await request(app)
        .get('/properties/property-123')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('property-123');
      expect(response.body.tenants).toHaveLength(2);
    });

    it('should return 404 for non-existent property', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.property.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/properties/nonexistent-id')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Property not found');
    });
  });

  describe('POST /properties', () => {
    it('should create a new property for admin', async () => {
      const newProperty = {
        name: 'New Property',
        address: '456 New Street',
        description: 'A new property'
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.property.create.mockResolvedValue({
        id: 'new-property-123',
        ...newProperty,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProperty);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newProperty.name);
      expect(response.body.address).toBe(newProperty.address);
    });

    it('should require name and address', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Only Name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Name and address are required');
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);

      const response = await request(app)
        .post('/properties')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Test', address: 'Test Address' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('PUT /properties/:id', () => {
    it('should update property for admin', async () => {
      const updatedProperty = {
        ...mockProperty,
        name: 'Updated Property Name'
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.property.update.mockResolvedValue(updatedProperty);

      const response = await request(app)
        .put('/properties/property-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Property Name' });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Property Name');
    });

    it('should return 404 for non-existent property', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('Property not found');
      error.code = 'P2025';
      mockPrisma.property.update.mockRejectedValue(error);

      const response = await request(app)
        .put('/properties/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Property not found');
    });
  });

  describe('DELETE /properties/:id', () => {
    it('should delete property for admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.property.delete.mockResolvedValue(mockProperty);

      const response = await request(app)
        .delete('/properties/property-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Property deleted successfully');
    });

    it('should return 404 for non-existent property', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('Property not found');
      error.code = 'P2025';
      mockPrisma.property.delete.mockRejectedValue(error);

      const response = await request(app)
        .delete('/properties/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Property not found');
    });
  });
});
