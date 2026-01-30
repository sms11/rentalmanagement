import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all tenants
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { propertyId, active } = req.query;

    const where = {};
    if (propertyId) where.propertyId = propertyId;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;

    const tenants = await prisma.tenant.findMany({
      where,
      include: {
        property: {
          select: { id: true, name: true, address: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// Get single tenant with collection history
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        property: {
          select: { id: true, name: true, address: true }
        },
        collections: {
          orderBy: { dueDate: 'desc' },
          take: 12,
          include: {
            assignedTo: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    next(error);
  }
});

// Create tenant (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      propertyId,
      name,
      email,
      phone,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      depositAmount,
      rentDueDay,
      lateFeePercentage,
      notes
    } = req.body;

    if (!propertyId || !name || !rentAmount) {
      return res.status(400).json({ error: 'Property, name, and rent amount are required' });
    }

    // Verify property exists
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const tenant = await prisma.tenant.create({
      data: {
        propertyId,
        name,
        email,
        phone,
        leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : null,
        leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null,
        rentAmount: parseFloat(rentAmount),
        depositAmount: depositAmount ? parseFloat(depositAmount) : 0,
        rentDueDay: rentDueDay || 1,
        lateFeePercentage: lateFeePercentage ? parseFloat(lateFeePercentage) : 0,
        notes
      },
      include: {
        property: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    res.status(201).json(tenant);
  } catch (error) {
    next(error);
  }
});

// Update tenant (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const {
      propertyId,
      name,
      email,
      phone,
      leaseStartDate,
      leaseEndDate,
      rentAmount,
      depositAmount,
      rentDueDay,
      lateFeePercentage,
      notes,
      isActive
    } = req.body;

    const updateData = {};
    if (propertyId) updateData.propertyId = propertyId;
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (leaseStartDate !== undefined) updateData.leaseStartDate = leaseStartDate ? new Date(leaseStartDate) : null;
    if (leaseEndDate !== undefined) updateData.leaseEndDate = leaseEndDate ? new Date(leaseEndDate) : null;
    if (rentAmount !== undefined) updateData.rentAmount = parseFloat(rentAmount);
    if (depositAmount !== undefined) updateData.depositAmount = parseFloat(depositAmount);
    if (rentDueDay !== undefined) updateData.rentDueDay = rentDueDay;
    if (lateFeePercentage !== undefined) updateData.lateFeePercentage = parseFloat(lateFeePercentage);
    if (notes !== undefined) updateData.notes = notes;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        property: {
          select: { id: true, name: true, address: true }
        }
      }
    });

    res.json(tenant);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    next(error);
  }
});

// Delete tenant (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tenant deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    next(error);
  }
});

export default router;
