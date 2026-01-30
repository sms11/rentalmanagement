import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all collections
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { tenantId, status, year, month, assignedToId } = req.query;

    const where = {};
    if (tenantId) where.tenantId = tenantId;
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;

    if (year && month) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      where.dueDate = {
        gte: startDate,
        lte: endDate
      };
    } else if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31);
      where.dueDate = {
        gte: startDate,
        lte: endDate
      };
    }

    const collections = await prisma.rentCollection.findMany({
      where,
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    res.json(collections);
  } catch (error) {
    next(error);
  }
});

// Get single collection
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const collection = await prisma.rentCollection.findUnique({
      where: { id: req.params.id },
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true, address: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        },
        reminderLogs: {
          orderBy: { sentAt: 'desc' }
        }
      }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    res.json(collection);
  } catch (error) {
    next(error);
  }
});

// Create collection (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { tenantId, dueDate, amount, assignedToId, notes } = req.body;

    if (!tenantId || !dueDate || !amount) {
      return res.status(400).json({ error: 'Tenant, due date, and amount are required' });
    }

    // Verify tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const collection = await prisma.rentCollection.create({
      data: {
        tenantId,
        dueDate: new Date(dueDate),
        amount: parseFloat(amount),
        assignedToId: assignedToId || null,
        notes
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
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json(collection);
  } catch (error) {
    next(error);
  }
});

// Generate monthly collections for all active tenants
router.post('/generate', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { year, month } = req.body;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const activeTenants = await prisma.tenant.findMany({
      where: { isActive: true }
    });

    const collections = [];
    for (const tenant of activeTenants) {
      const dueDate = new Date(parseInt(year), parseInt(month) - 1, tenant.rentDueDay);

      // Check if collection already exists for this tenant and month
      const existing = await prisma.rentCollection.findFirst({
        where: {
          tenantId: tenant.id,
          dueDate: {
            gte: new Date(parseInt(year), parseInt(month) - 1, 1),
            lt: new Date(parseInt(year), parseInt(month), 1)
          }
        }
      });

      if (!existing) {
        const collection = await prisma.rentCollection.create({
          data: {
            tenantId: tenant.id,
            dueDate,
            amount: tenant.rentAmount
          }
        });
        collections.push(collection);
      }
    }

    res.status(201).json({
      message: `Generated ${collections.length} collections`,
      collections
    });
  } catch (error) {
    next(error);
  }
});

// Update collection
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { assignedToId, notes, status } = req.body;

    // Staff can only update assignment and notes
    const updateData = {};
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId || null;
    if (notes !== undefined) updateData.notes = notes;

    // Only admin can change status directly
    if (status && req.user.role === 'ADMIN') {
      updateData.status = status;
    }

    const collection = await prisma.rentCollection.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true }
            }
          }
        },
        assignedTo: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(collection);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    next(error);
  }
});

// Record payment
router.put('/:id/pay', authenticate, async (req, res, next) => {
  try {
    const { paidAmount, paymentMethod, notes } = req.body;

    if (!paidAmount) {
      return res.status(400).json({ error: 'Paid amount is required' });
    }

    const collection = await prisma.rentCollection.findUnique({
      where: { id: req.params.id }
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const totalPaid = collection.paidAmount + parseFloat(paidAmount);
    const totalDue = collection.amount + collection.lateFee;

    let status = 'PARTIAL';
    if (totalPaid >= totalDue) {
      status = 'PAID';
    }

    const updated = await prisma.rentCollection.update({
      where: { id: req.params.id },
      data: {
        paidAmount: totalPaid,
        paidDate: new Date(),
        paymentMethod,
        status,
        notes: notes ? (collection.notes ? `${collection.notes}\n${notes}` : notes) : collection.notes
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
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete collection (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.rentCollection.delete({ where: { id: req.params.id } });
    res.json({ message: 'Collection deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Collection not found' });
    }
    next(error);
  }
});

// Get collections assigned to current user
router.get('/my/assigned', authenticate, async (req, res, next) => {
  try {
    const collections = await prisma.rentCollection.findMany({
      where: {
        assignedToId: req.user.id,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] }
      },
      include: {
        tenant: {
          include: {
            property: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { dueDate: 'asc' }
    });

    res.json(collections);
  } catch (error) {
    next(error);
  }
});

export default router;
