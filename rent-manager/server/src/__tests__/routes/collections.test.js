import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, prismaMock, generateToken, fixtures } from '../helpers/index.js';

const app = createTestApp();

describe('Collections Routes', () => {
  let adminToken;
  let staffToken;
  let adminUser;
  let staffUser;
  let testTenant;
  let testProperty;
  let testCollection;

  beforeEach(() => {
    jest.clearAllMocks();

    adminUser = fixtures.createUser({ role: 'ADMIN' });
    staffUser = fixtures.createUser({ id: 'staff-1', email: 'staff@test.com', role: 'STAFF' });
    adminToken = generateToken(adminUser);
    staffToken = generateToken(staffUser);

    testProperty = fixtures.createProperty();
    testTenant = fixtures.createTenant({ propertyId: testProperty.id });
    testCollection = fixtures.createCollection({ tenantId: testTenant.id });

    // Default mock for user lookup in auth middleware
    prismaMock.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === adminUser.id) return Promise.resolve(adminUser);
      if (where.id === staffUser.id) return Promise.resolve(staffUser);
      return Promise.resolve(null);
    });
  });

  describe('GET /api/collections', () => {
    it('should return all collections', async () => {
      const collections = [
        { ...testCollection, tenant: { ...testTenant, property: testProperty }, assignedTo: null }
      ];
      prismaMock.rentCollection.findMany.mockResolvedValue(collections);

      const res = await request(app)
        .get('/api/collections')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });

    it('should filter by tenant', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/collections')
        .query({ tenantId: testTenant.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: testTenant.id })
        })
      );
    });

    it('should filter by status', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/collections')
        .query({ status: 'PENDING' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' })
        })
      );
    });

    it('should filter by year and month', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/collections')
        .query({ year: '2024', month: '6' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date)
            })
          })
        })
      );
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/collections');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/collections/:id', () => {
    it('should return a single collection', async () => {
      const collection = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null,
        reminderLogs: []
      };
      prismaMock.rentCollection.findUnique.mockResolvedValue(collection);

      const res = await request(app)
        .get(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testCollection.id);
    });

    it('should return 404 if not found', async () => {
      prismaMock.rentCollection.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/collections/non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Collection not found');
    });
  });

  describe('POST /api/collections', () => {
    it('should create a collection (admin)', async () => {
      const newCollection = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      };
      prismaMock.tenant.findUnique.mockResolvedValue(testTenant);
      prismaMock.rentCollection.create.mockResolvedValue(newCollection);

      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tenantId: testTenant.id,
          dueDate: '2024-06-15',
          amount: 15000
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(testCollection.id);
    });

    it('should reject if not admin', async () => {
      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          tenantId: testTenant.id,
          dueDate: '2024-06-15',
          amount: 15000
        });

      expect(res.status).toBe(403);
    });

    it('should require tenant, dueDate, and amount', async () => {
      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tenantId: testTenant.id });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 404 if tenant not found', async () => {
      prismaMock.tenant.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tenantId: 'non-existent',
          dueDate: '2024-06-15',
          amount: 15000
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Tenant not found');
    });
  });

  describe('POST /api/collections/generate', () => {
    it('should generate collections for active tenants', async () => {
      const activeTenants = [testTenant, { ...testTenant, id: 'tenant-2', rentAmount: 20000 }];
      prismaMock.tenant.findMany.mockResolvedValue(activeTenants);
      prismaMock.rentCollection.findFirst.mockResolvedValue(null); // No existing collections
      prismaMock.rentCollection.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: `col-${data.tenantId}`, ...data })
      );

      const res = await request(app)
        .post('/api/collections/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ year: 2024, month: 6 });

      expect(res.status).toBe(201);
      expect(res.body.message).toContain('2 collections');
      expect(res.body.collections.length).toBe(2);
    });

    it('should skip existing collections', async () => {
      prismaMock.tenant.findMany.mockResolvedValue([testTenant]);
      prismaMock.rentCollection.findFirst.mockResolvedValue(testCollection); // Already exists

      const res = await request(app)
        .post('/api/collections/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ year: 2024, month: 6 });

      expect(res.status).toBe(201);
      expect(res.body.collections.length).toBe(0);
    });

    it('should require year and month', async () => {
      const res = await request(app)
        .post('/api/collections/generate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ year: 2024 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('PUT /api/collections/:id', () => {
    it('should update assignment (staff)', async () => {
      const updated = { ...testCollection, assignedToId: staffUser.id };
      prismaMock.rentCollection.update.mockResolvedValue({
        ...updated,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: staffUser
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ assignedToId: staffUser.id });

      expect(res.status).toBe(200);
    });

    it('should allow admin to change status', async () => {
      prismaMock.rentCollection.update.mockResolvedValue({
        ...testCollection,
        status: 'PAID',
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'PAID' });

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' })
        })
      );
    });

    it('should not allow staff to change status', async () => {
      prismaMock.rentCollection.update.mockResolvedValue({
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ status: 'PAID', notes: 'updated' });

      expect(res.status).toBe(200);
      // Status should not be in update data for staff
      expect(prismaMock.rentCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ status: 'PAID' })
        })
      );
    });

    it('should return 404 if not found', async () => {
      prismaMock.rentCollection.update.mockRejectedValue({ code: 'P2025' });

      const res = await request(app)
        .put('/api/collections/non-existent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ notes: 'test' });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/collections/:id/pay', () => {
    it('should record payment and set status to PARTIAL', async () => {
      const existingCollection = { ...testCollection, paidAmount: 0, lateFee: 0 };
      prismaMock.rentCollection.findUnique.mockResolvedValue(existingCollection);
      prismaMock.rentCollection.update.mockResolvedValue({
        ...existingCollection,
        paidAmount: 5000,
        status: 'PARTIAL',
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}/pay`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paidAmount: 5000, paymentMethod: 'CASH' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PARTIAL');
    });

    it('should set status to PAID when fully paid', async () => {
      const existingCollection = { ...testCollection, amount: 15000, paidAmount: 10000, lateFee: 0 };
      prismaMock.rentCollection.findUnique.mockResolvedValue(existingCollection);
      prismaMock.rentCollection.update.mockResolvedValue({
        ...existingCollection,
        paidAmount: 15000,
        status: 'PAID',
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}/pay`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paidAmount: 5000 });

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'PAID' })
        })
      );
    });

    it('should include late fee in total calculation', async () => {
      const existingCollection = { ...testCollection, amount: 15000, paidAmount: 0, lateFee: 500 };
      prismaMock.rentCollection.findUnique.mockResolvedValue(existingCollection);
      prismaMock.rentCollection.update.mockResolvedValue({
        ...existingCollection,
        paidAmount: 15000,
        status: 'PARTIAL', // 15000 < 15500 (amount + lateFee)
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null
      });

      const res = await request(app)
        .put(`/api/collections/${testCollection.id}/pay`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paidAmount: 15000 });

      expect(res.status).toBe(200);
    });

    it('should require paidAmount', async () => {
      const res = await request(app)
        .put(`/api/collections/${testCollection.id}/pay`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paymentMethod: 'CASH' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });

    it('should return 404 if collection not found', async () => {
      prismaMock.rentCollection.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/collections/non-existent/pay')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ paidAmount: 5000 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/collections/:id', () => {
    it('should delete collection (admin)', async () => {
      prismaMock.rentCollection.delete.mockResolvedValue(testCollection);

      const res = await request(app)
        .delete(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should reject if not admin', async () => {
      const res = await request(app)
        .delete(`/api/collections/${testCollection.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if not found', async () => {
      prismaMock.rentCollection.delete.mockRejectedValue({ code: 'P2025' });

      const res = await request(app)
        .delete('/api/collections/non-existent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/collections/my/assigned', () => {
    it('should return collections assigned to current user', async () => {
      const assigned = [
        { ...testCollection, assignedToId: staffUser.id, tenant: { ...testTenant, property: testProperty } }
      ];
      prismaMock.rentCollection.findMany.mockResolvedValue(assigned);

      const res = await request(app)
        .get('/api/collections/my/assigned')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: staffUser.id,
            status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] }
          })
        })
      );
    });
  });
});
