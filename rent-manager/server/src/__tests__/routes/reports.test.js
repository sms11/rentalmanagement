import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, prismaMock, generateToken, fixtures } from '../helpers/index.js';

const app = createTestApp();

describe('Reports Routes', () => {
  let adminToken;
  let adminUser;
  let testProperty;
  let testTenant;

  beforeEach(() => {
    jest.clearAllMocks();

    adminUser = fixtures.createUser({ role: 'ADMIN' });
    adminToken = generateToken(adminUser);
    testProperty = fixtures.createProperty();
    testTenant = fixtures.createTenant({ propertyId: testProperty.id });

    prismaMock.user.findUnique.mockResolvedValue(adminUser);
  });

  describe('GET /api/reports/collections', () => {
    it('should return collections report', async () => {
      const collections = [
        {
          ...fixtures.createCollection({ tenantId: testTenant.id }),
          tenant: { ...testTenant, property: testProperty }
        }
      ];
      prismaMock.rentCollection.findMany.mockResolvedValue(collections);
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 15000, paidAmount: 10000 },
        _count: 1
      });

      const res = await request(app)
        .get('/api/reports/collections')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('collections');
      expect(res.body).toHaveProperty('summary');
    });

    it('should filter by year and month', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 0, paidAmount: 0 },
        _count: 0
      });

      const res = await request(app)
        .get('/api/reports/collections')
        .query({ year: '2024', month: '6' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.any(Object)
          })
        })
      );
    });

    it('should filter by status', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 0, paidAmount: 0 },
        _count: 0
      });

      const res = await request(app)
        .get('/api/reports/collections')
        .query({ year: '2024', status: 'PAID' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PAID'
          })
        })
      );
    });

    it('should filter by property', async () => {
      prismaMock.rentCollection.findMany.mockResolvedValue([]);
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 0, paidAmount: 0 },
        _count: 0
      });

      const res = await request(app)
        .get('/api/reports/collections')
        .query({ year: '2024', propertyId: testProperty.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/reports/collections');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/reports/tenants', () => {
    it('should return tenant-wise report', async () => {
      const tenants = [
        {
          ...testTenant,
          property: testProperty,
          collections: [
            fixtures.createCollection({ tenantId: testTenant.id, status: 'PAID', paidAmount: 15000 }),
            fixtures.createCollection({ id: 'col-2', tenantId: testTenant.id, status: 'PENDING', paidAmount: 0 })
          ]
        }
      ];
      prismaMock.tenant.findMany.mockResolvedValue(tenants);

      const res = await request(app)
        .get('/api/reports/tenants')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tenants');
      expect(res.body).toHaveProperty('summary');
    });

    it('should filter by property', async () => {
      prismaMock.tenant.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/reports/tenants')
        .query({ year: '2024', propertyId: testProperty.id })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.tenant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            propertyId: testProperty.id
          })
        })
      );
    });

    it('should calculate tenant balance correctly', async () => {
      const tenants = [
        {
          ...testTenant,
          property: testProperty,
          collections: [
            { ...fixtures.createCollection(), amount: 15000, paidAmount: 10000 }
          ]
        }
      ];
      prismaMock.tenant.findMany.mockResolvedValue(tenants);

      const res = await request(app)
        .get('/api/reports/tenants')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // totalExpected: 15000, totalPaid: 10000, balance: 5000
      expect(res.body.tenants[0].balance).toBe(5000);
    });
  });

  describe('GET /api/reports/properties', () => {
    it('should return property-wise report', async () => {
      const properties = [
        {
          ...testProperty,
          tenants: [
            {
              ...testTenant,
              collections: [
                fixtures.createCollection({ status: 'PAID', paidAmount: 15000 })
              ]
            }
          ]
        }
      ];
      prismaMock.property.findMany.mockResolvedValue(properties);

      const res = await request(app)
        .get('/api/reports/properties')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('properties');
      expect(res.body).toHaveProperty('summary');
    });

    it('should calculate collection rate per property', async () => {
      const properties = [
        {
          ...testProperty,
          tenants: [
            {
              ...testTenant,
              collections: [
                { ...fixtures.createCollection(), amount: 10000, paidAmount: 8000 }
              ]
            }
          ]
        }
      ];
      prismaMock.property.findMany.mockResolvedValue(properties);

      const res = await request(app)
        .get('/api/reports/properties')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      // Collection rate: (8000 / 10000) * 100 = 80%
      expect(res.body.properties[0].collectionRate).toBe(80);
    });

    it('should handle properties with no tenants', async () => {
      const properties = [{ ...testProperty, tenants: [] }];
      prismaMock.property.findMany.mockResolvedValue(properties);

      const res = await request(app)
        .get('/api/reports/properties')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.properties[0].tenantCount).toBe(0);
      expect(res.body.properties[0].collectionRate).toBe(0);
    });
  });
});
