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
    findUnique: jest.fn()
  },
  tenant: {
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
const { default: tenantRoutes } = await import('../../routes/tenants.js');

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
  address: '123 Test Street'
};

const mockTenant = {
  id: 'tenant-123',
  propertyId: 'property-123',
  name: 'Test Tenant',
  email: 'tenant@example.com',
  phone: '555-1234',
  rentAmount: 1000,
  depositAmount: 2000,
  rentDueDay: 1,
  lateFeePercentage: 5,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  property: mockProperty
};

// Create test app
const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/tenants', tenantRoutes);
  app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message });
  });
  return app;
};

describe('Tenants Routes', () => {
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

  describe('GET /tenants', () => {
    it('should return all tenants', async () => {
      const tenants = [mockTenant, { ...mockTenant, id: 'tenant-456', name: 'Another Tenant' }];
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.tenant.findMany.mockResolvedValue(tenants);

      const response = await request(app)
        .get('/tenants')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });

    it('should filter by propertyId', async () => {
      const tenants = [mockTenant];
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.tenant.findMany.mockResolvedValue(tenants);

      const response = await request(app)
        .get('/tenants?propertyId=property-123')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ propertyId: 'property-123' })
        })
      );
    });

    it('should filter by active status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.tenant.findMany.mockResolvedValue([mockTenant]);

      const response = await request(app)
        .get('/tenants?active=true')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(mockPrisma.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true })
        })
      );
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .get('/tenants');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /tenants/:id', () => {
    it('should return tenant with property and collections', async () => {
      const tenantWithCollections = {
        ...mockTenant,
        collections: [
          { id: 'collection-1', amount: 1000, status: 'PAID' },
          { id: 'collection-2', amount: 1000, status: 'PENDING' }
        ]
      };
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.tenant.findUnique.mockResolvedValue(tenantWithCollections);

      const response = await request(app)
        .get('/tenants/tenant-123')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('tenant-123');
      expect(response.body.collections).toHaveLength(2);
      expect(response.body.property).toBeDefined();
    });

    it('should return 404 for non-existent tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);
      mockPrisma.tenant.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/tenants/nonexistent-id')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tenant not found');
    });
  });

  describe('POST /tenants', () => {
    it('should create a new tenant for admin', async () => {
      const newTenant = {
        propertyId: 'property-123',
        name: 'New Tenant',
        email: 'newtenant@example.com',
        phone: '555-5678',
        rentAmount: 1200,
        rentDueDay: 1
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.property.findUnique.mockResolvedValue(mockProperty);
      mockPrisma.tenant.create.mockResolvedValue({
        id: 'new-tenant-123',
        ...newTenant,
        isActive: true,
        property: mockProperty
      });

      const response = await request(app)
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newTenant);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newTenant.name);
      expect(response.body.property).toBeDefined();
    });

    it('should require propertyId, name, and rentAmount', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      const response = await request(app)
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Only Name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Property, name, and rent amount are required');
    });

    it('should reject non-existent property', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.property.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          propertyId: 'nonexistent-property',
          name: 'Test Tenant',
          rentAmount: 1000
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Property not found');
    });

    it('should reject non-admin users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(staffUser);

      const response = await request(app)
        .post('/tenants')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          propertyId: 'property-123',
          name: 'Test Tenant',
          rentAmount: 1000
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Admin access required');
    });
  });

  describe('PUT /tenants/:id', () => {
    it('should update tenant for admin', async () => {
      const updatedTenant = {
        ...mockTenant,
        name: 'Updated Tenant Name',
        rentAmount: 1500
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant);

      const response = await request(app)
        .put('/tenants/tenant-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Tenant Name', rentAmount: 1500 });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Tenant Name');
      expect(response.body.rentAmount).toBe(1500);
    });

    it('should update tenant isActive status', async () => {
      const updatedTenant = {
        ...mockTenant,
        isActive: false
      };

      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.tenant.update.mockResolvedValue(updatedTenant);

      const response = await request(app)
        .put('/tenants/tenant-123')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });

    it('should return 404 for non-existent tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('Tenant not found');
      error.code = 'P2025';
      mockPrisma.tenant.update.mockRejectedValue(error);

      const response = await request(app)
        .put('/tenants/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tenant not found');
    });
  });

  describe('DELETE /tenants/:id', () => {
    it('should delete tenant for admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.tenant.delete.mockResolvedValue(mockTenant);

      const response = await request(app)
        .delete('/tenants/tenant-123')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Tenant deleted successfully');
    });

    it('should return 404 for non-existent tenant', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      const error = new Error('Tenant not found');
      error.code = 'P2025';
      mockPrisma.tenant.delete.mockRejectedValue(error);

      const response = await request(app)
        .delete('/tenants/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Tenant not found');
    });
  });
});
