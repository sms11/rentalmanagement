import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get dashboard summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = month ? parseInt(month) : null;

    let dateFilter = {};
    if (currentMonth) {
      dateFilter = {
        gte: new Date(currentYear, currentMonth - 1, 1),
        lt: new Date(currentYear, currentMonth, 1)
      };
    } else {
      dateFilter = {
        gte: new Date(currentYear, 0, 1),
        lt: new Date(currentYear + 1, 0, 1)
      };
    }

    // Get all collections for the period
    const collections = await prisma.rentCollection.findMany({
      where: {
        dueDate: dateFilter
      }
    });

    // Calculate totals
    const totalExpected = collections.reduce((sum, c) => sum + c.amount + c.lateFee, 0);
    const totalCollected = collections.reduce((sum, c) => sum + c.paidAmount, 0);
    const totalRemaining = totalExpected - totalCollected;

    const paidCount = collections.filter(c => c.status === 'PAID').length;
    const pendingCount = collections.filter(c => c.status === 'PENDING').length;
    const overdueCount = collections.filter(c => c.status === 'OVERDUE').length;
    const partialCount = collections.filter(c => c.status === 'PARTIAL').length;

    const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;

    // Get property and tenant counts
    const propertyCount = await prisma.property.count({ where: { isActive: true } });
    const tenantCount = await prisma.tenant.count({ where: { isActive: true } });

    res.json({
      period: {
        year: currentYear,
        month: currentMonth
      },
      financial: {
        totalExpected,
        totalCollected,
        totalRemaining,
        collectionRate: Math.round(collectionRate * 100) / 100
      },
      collections: {
        total: collections.length,
        paid: paidCount,
        pending: pendingCount,
        overdue: overdueCount,
        partial: partialCount
      },
      assets: {
        properties: propertyCount,
        tenants: tenantCount
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get monthly trend for a year
router.get('/trend', authenticate, async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1);

      const collections = await prisma.rentCollection.findMany({
        where: {
          dueDate: {
            gte: startDate,
            lt: endDate
          }
        }
      });

      const expected = collections.reduce((sum, c) => sum + c.amount + c.lateFee, 0);
      const collected = collections.reduce((sum, c) => sum + c.paidAmount, 0);

      monthlyData.push({
        month: month + 1,
        monthName: startDate.toLocaleString('default', { month: 'short' }),
        expected,
        collected,
        pending: expected - collected
      });
    }

    res.json({
      year,
      data: monthlyData
    });
  } catch (error) {
    next(error);
  }
});

// Get upcoming due collections
router.get('/upcoming', authenticate, async (req, res, next) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const collections = await prisma.rentCollection.findMany({
      where: {
        dueDate: {
          gte: today,
          lte: nextWeek
        },
        status: { in: ['PENDING', 'PARTIAL'] }
      },
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    res.json(collections);
  } catch (error) {
    next(error);
  }
});

// Get overdue collections
router.get('/overdue', authenticate, async (req, res, next) => {
  try {
    const today = new Date();

    const collections = await prisma.rentCollection.findMany({
      where: {
        dueDate: { lt: today },
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] }
      },
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    // Update status to OVERDUE
    for (const collection of collections) {
      if (collection.status !== 'OVERDUE') {
        await prisma.rentCollection.update({
          where: { id: collection.id },
          data: { status: 'OVERDUE' }
        });
        collection.status = 'OVERDUE';
      }
    }

    res.json(collections);
  } catch (error) {
    next(error);
  }
});

export default router;
