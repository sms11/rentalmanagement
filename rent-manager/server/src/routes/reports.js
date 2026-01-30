import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Get collections report
router.get('/collections', authenticate, async (req, res, next) => {
  try {
    const { year, month, propertyId, status } = req.query;

    const where = {};

    if (year && month) {
      where.dueDate = {
        gte: new Date(parseInt(year), parseInt(month) - 1, 1),
        lt: new Date(parseInt(year), parseInt(month), 1)
      };
    } else if (year) {
      where.dueDate = {
        gte: new Date(parseInt(year), 0, 1),
        lt: new Date(parseInt(year) + 1, 0, 1)
      };
    }

    if (status) where.status = status;

    if (propertyId) {
      where.tenant = {
        propertyId
      };
    }

    const collections = await prisma.rentCollection.findMany({
      where,
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true, address: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { tenant: { property: { name: 'asc' } } },
        { tenant: { name: 'asc' } },
        { dueDate: 'asc' }
      ]
    });

    // Calculate summary
    const summary = {
      totalRecords: collections.length,
      totalExpected: collections.reduce((sum, c) => sum + c.amount + c.lateFee, 0),
      totalCollected: collections.reduce((sum, c) => sum + c.paidAmount, 0),
      totalLateFees: collections.reduce((sum, c) => sum + c.lateFee, 0),
      byStatus: {
        paid: collections.filter(c => c.status === 'PAID').length,
        pending: collections.filter(c => c.status === 'PENDING').length,
        overdue: collections.filter(c => c.status === 'OVERDUE').length,
        partial: collections.filter(c => c.status === 'PARTIAL').length
      }
    };
    summary.totalRemaining = summary.totalExpected - summary.totalCollected;

    res.json({
      filters: { year, month, propertyId, status },
      summary,
      collections
    });
  } catch (error) {
    next(error);
  }
});

// Get tenant-wise report
router.get('/tenants', authenticate, async (req, res, next) => {
  try {
    const { year, propertyId } = req.query;
    const reportYear = parseInt(year) || new Date().getFullYear();

    const where = { isActive: true };
    if (propertyId) where.propertyId = propertyId;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true }
        },
        collections: {
          where: {
            dueDate: {
              gte: new Date(reportYear, 0, 1),
              lt: new Date(reportYear + 1, 0, 1)
            }
          }
        }
      },
      orderBy: [
        { property: { name: 'asc' } },
        { name: 'asc' }
      ]
    });

    const report = tenants.map(tenant => {
      const totalExpected = tenant.collections.reduce((sum, c) => sum + c.amount + c.lateFee, 0);
      const totalPaid = tenant.collections.reduce((sum, c) => sum + c.paidAmount, 0);

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          rentAmount: tenant.rentAmount
        },
        property: tenant.property,
        year: reportYear,
        totalExpected,
        totalPaid,
        balance: totalExpected - totalPaid,
        collectionCount: tenant.collections.length,
        paidCount: tenant.collections.filter(c => c.status === 'PAID').length
      };
    });

    const summary = {
      totalTenants: report.length,
      totalExpected: report.reduce((sum, r) => sum + r.totalExpected, 0),
      totalPaid: report.reduce((sum, r) => sum + r.totalPaid, 0),
      totalBalance: report.reduce((sum, r) => sum + r.balance, 0)
    };

    res.json({
      year: reportYear,
      summary,
      tenants: report
    });
  } catch (error) {
    next(error);
  }
});

// Get property-wise report
router.get('/properties', authenticate, async (req, res, next) => {
  try {
    const { year } = req.query;
    const reportYear = parseInt(year) || new Date().getFullYear();

    const properties = await prisma.property.findMany({
      where: { isActive: true },
      include: {
        tenants: {
          where: { isActive: true },
          include: {
            collections: {
              where: {
                dueDate: {
                  gte: new Date(reportYear, 0, 1),
                  lt: new Date(reportYear + 1, 0, 1)
                }
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const report = properties.map(property => {
      const allCollections = property.tenants.flatMap(t => t.collections);
      const totalExpected = allCollections.reduce((sum, c) => sum + c.amount + c.lateFee, 0);
      const totalPaid = allCollections.reduce((sum, c) => sum + c.paidAmount, 0);

      return {
        property: {
          id: property.id,
          name: property.name,
          address: property.address
        },
        year: reportYear,
        tenantCount: property.tenants.length,
        totalExpected,
        totalPaid,
        balance: totalExpected - totalPaid,
        collectionRate: totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0
      };
    });

    const summary = {
      totalProperties: report.length,
      totalTenants: report.reduce((sum, r) => sum + r.tenantCount, 0),
      totalExpected: report.reduce((sum, r) => sum + r.totalExpected, 0),
      totalPaid: report.reduce((sum, r) => sum + r.totalPaid, 0),
      totalBalance: report.reduce((sum, r) => sum + r.balance, 0)
    };

    res.json({
      year: reportYear,
      summary,
      properties: report
    });
  } catch (error) {
    next(error);
  }
});

export default router;
