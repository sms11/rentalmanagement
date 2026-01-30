import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createTestApp, prismaMock, generateToken, fixtures } from '../helpers/index.js';

const app = createTestApp();

describe('Notifications Routes', () => {
  let adminToken;
  let staffToken;
  let adminUser;
  let staffUser;
  let testNotification;

  beforeEach(() => {
    jest.clearAllMocks();

    adminUser = fixtures.createUser({ role: 'ADMIN' });
    staffUser = fixtures.createUser({ id: 'staff-1', email: 'staff@test.com', role: 'STAFF' });
    adminToken = generateToken(adminUser);
    staffToken = generateToken(staffUser);

    testNotification = {
      id: 'notif-1',
      userId: staffUser.id,
      title: 'Test Notification',
      message: 'This is a test notification',
      type: 'REMINDER',
      isRead: false,
      createdAt: new Date()
    };

    prismaMock.user.findUnique.mockImplementation(({ where }) => {
      if (where.id === adminUser.id) return Promise.resolve(adminUser);
      if (where.id === staffUser.id) return Promise.resolve(staffUser);
      return Promise.resolve(null);
    });
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      const notifications = [testNotification];
      prismaMock.notification.findMany.mockResolvedValue(notifications);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: staffUser.id
          }),
          orderBy: { createdAt: 'desc' },
          take: 50
        })
      );
    });

    it('should filter unread only', async () => {
      prismaMock.notification.findMany.mockResolvedValue([testNotification]);

      const res = await request(app)
        .get('/api/notifications')
        .query({ unread: 'true' })
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: staffUser.id,
            isRead: false
          })
        })
      );
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      prismaMock.notification.count.mockResolvedValue(5);

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(5);
      expect(prismaMock.notification.count).toHaveBeenCalledWith({
        where: { userId: staffUser.id, isRead: false }
      });
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(testNotification);
      prismaMock.notification.update.mockResolvedValue({ ...testNotification, isRead: true });

      const res = await request(app)
        .put(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.isRead).toBe(true);
    });

    it('should not allow marking other user notification', async () => {
      const otherUserNotification = { ...testNotification, userId: adminUser.id };
      prismaMock.notification.findUnique.mockResolvedValue(otherUserNotification);

      const res = await request(app)
        .put(`/api/notifications/${testNotification.id}/read`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .put('/api/notifications/non-existent/read')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('marked as read');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: staffUser.id, isRead: false },
        data: { isRead: true }
      });
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete own notification', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(testNotification);
      prismaMock.notification.delete.mockResolvedValue(testNotification);

      const res = await request(app)
        .delete(`/api/notifications/${testNotification.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    it('should not allow deleting other user notification', async () => {
      const otherUserNotification = { ...testNotification, userId: adminUser.id };
      prismaMock.notification.findUnique.mockResolvedValue(otherUserNotification);

      const res = await request(app)
        .delete(`/api/notifications/${testNotification.id}`)
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 if not found', async () => {
      prismaMock.notification.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .delete('/api/notifications/non-existent')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/notifications', () => {
    it('should clear all user notifications', async () => {
      prismaMock.notification.deleteMany.mockResolvedValue({ count: 10 });

      const res = await request(app)
        .delete('/api/notifications')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cleared');
      expect(prismaMock.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: staffUser.id }
      });
    });
  });
});
