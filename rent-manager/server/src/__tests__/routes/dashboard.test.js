import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, prismaMock, generateToken, fixtures } from '../helpers/index.js';

const app = createTestApp();

describe('Dashboard Routes', () => {
  let adminToken;
  let adminUser;

  beforeEach(() => {
    jest.clearAllMocks();

    adminUser = fixtures.createUser({ role: 'ADMIN' });
    adminToken = generateToken(adminUser);

    prismaMock.user.findUnique.mockResolvedValue(adminUser);
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return dashboard summary', async () => {
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 100000, paidAmount: 75000 }
      });
      prismaMock.rentCollection.groupBy.mockResolvedValue([
        { status: 'PAID', _count: 5 },
        { status: 'PENDING', _count: 3 },
        { status: 'OVERDUE', _count: 2 }
      ]);
      prismaMock.property.count.mockResolvedValue(5);
      prismaMock.tenant.count.mockResolvedValue(10);

      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalExpected');
      expect(res.body).toHaveProperty('totalCollected');
      expect(res.body).toHaveProperty('collectionRate');
    });

    it('should filter by year and month', async () => {
      prismaMock.rentCollection.aggregate.mockResolvedValue({
        _sum: { amount: 50000, paidAmount: 40000 }
      });
      prismaMock.rentCollection.groupBy.mockResolvedValue([]);
      prismaMock.property.count.mockResolvedValue(5);
      prismaMock.tenant.count.mockResolvedValue(10);

      const res = await request(app)
        .get('/api/dashboard/summary')
        .query({ year: '2024', month: '6' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.any(Object)
          })
        })
      );
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/trend', () => {
    it('should return monthly trend data', async () => {
      // Mock 12 months of data
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        expected: 100000,
        collected: 80000 + i * 1000
      }));

      prismaMock.rentCollection.groupBy.mockResolvedValue(
        monthlyData.map(m => ({
          _sum: { amount: m.expected, paidAmount: m.collected }
        }))
      );

      const res = await request(app)
        .get('/api/dashboard/trend')
        .query({ year: '2024' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should default to current year', async () => {
      prismaMock.rentCollection.groupBy.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard/trend')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/upcoming', () => {
    it('should return upcoming collections', async () => {
      const upcoming = [
        fixtures.createCollection({ status: 'PENDING' }),
        fixtures.createCollection({ id: 'col-2', status: 'PARTIAL' })
      ];

      prismaMock.rentCollection.findMany.mockResolvedValue(
        upcoming.map(c => ({
          ...c,
          tenant: { ...fixtures.createTenant(), property: fixtures.createProperty() }
        }))
      );

      const res = await request(app)
        .get('/api/dashboard/upcoming')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'PARTIAL'] }
          }),
          take: 10
        })
      );
    });
  });

  describe('GET /api/dashboard/overdue', () => {
    it('should return overdue collections', async () => {
      const overdue = [fixtures.createCollection({ status: 'OVERDUE' })];

      prismaMock.rentCollection.findMany.mockResolvedValue(
        overdue.map(c => ({
          ...c,
          tenant: { ...fixtures.createTenant(), property: fixtures.createProperty() }
        }))
      );

      const res = await request(app)
        .get('/api/dashboard/overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should update overdue status for past due collections', async () => {
      prismaMock.rentCollection.updateMany.mockResolvedValue({ count: 3 });
      prismaMock.rentCollection.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/dashboard/overdue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.rentCollection.updateMany).toHaveBeenCalled();
    });
  });
});
