import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get user's notifications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { unreadOnly } = req.query;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Get unread count
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', authenticate, async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: {
        id: req.params.id,
        userId: req.user.id
      },
      data: { isRead: true }
    });

    res.json(notification);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    next(error);
  }
});

// Mark all as read
router.put('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: {
        id: req.params.id,
        userId: req.user.id
      }
    });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Notification not found' });
    }
    next(error);
  }
});

// Clear all notifications
router.delete('/', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { userId: req.user.id }
    });

    res.json({ message: 'All notifications cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;
