import { Router } from 'express';
import prisma from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Get all properties
router.get('/', authenticate, async (req, res, next) => {
  try {
    const properties = await prisma.property.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: { tenants: { where: { isActive: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = properties.map(p => ({
      ...p,
      tenantCount: p._count.tenants,
      _count: undefined
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get single property
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        tenants: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    next(error);
  }
});

// Create property (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, description } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    const property = await prisma.property.create({
      data: { name, address, description }
    });

    res.status(201).json(property);
  } catch (error) {
    next(error);
  }
});

// Update property (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const { name, address, description, isActive } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (description !== undefined) updateData.description = description;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;

    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(property);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Property not found' });
    }
    next(error);
  }
});

// Delete property (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } });
    res.json({ message: 'Property deleted successfully' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Property not found' });
    }
    next(error);
  }
});

export default router;
