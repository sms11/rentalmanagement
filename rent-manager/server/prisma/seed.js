import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@rentmanager.com' },
    update: {},
    create: {
      email: 'admin@rentmanager.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN'
    }
  });
  console.log('Created admin user:', admin.email);

  // Create staff user
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staff = await prisma.user.upsert({
    where: { email: 'staff@rentmanager.com' },
    update: {},
    create: {
      email: 'staff@rentmanager.com',
      password: staffPassword,
      name: 'Staff User',
      role: 'STAFF'
    }
  });
  console.log('Created staff user:', staff.email);

  // Create sample properties
  const property1 = await prisma.property.create({
    data: {
      name: 'Main Office Building',
      address: 'Kathmandu, Nepal',
      description: 'Primary office location with multiple units'
    }
  });

  const property2 = await prisma.property.create({
    data: {
      name: 'Commercial Complex',
      address: 'Lalitpur, Nepal',
      description: 'Shopping complex with retail spaces'
    }
  });
  console.log('Created sample properties');

  // Create sample tenants
  const tenant1 = await prisma.tenant.create({
    data: {
      propertyId: property1.id,
      name: 'ABC Company',
      email: 'abc@example.com',
      phone: '9841000001',
      rentAmount: 50000,
      depositAmount: 100000,
      rentDueDay: 5,
      lateFeePercentage: 2,
      leaseStartDate: new Date('2024-01-01'),
      leaseEndDate: new Date('2025-12-31')
    }
  });

  const tenant2 = await prisma.tenant.create({
    data: {
      propertyId: property1.id,
      name: 'XYZ Trading',
      email: 'xyz@example.com',
      phone: '9841000002',
      rentAmount: 35000,
      depositAmount: 70000,
      rentDueDay: 10,
      lateFeePercentage: 2,
      leaseStartDate: new Date('2024-03-01'),
      leaseEndDate: new Date('2025-02-28')
    }
  });

  const tenant3 = await prisma.tenant.create({
    data: {
      propertyId: property2.id,
      name: 'Fashion Hub',
      email: 'fashion@example.com',
      phone: '9841000003',
      rentAmount: 75000,
      depositAmount: 150000,
      rentDueDay: 1,
      lateFeePercentage: 3,
      leaseStartDate: new Date('2024-06-01'),
      leaseEndDate: new Date('2026-05-31')
    }
  });
  console.log('Created sample tenants');

  // Create sample rent collections for current month
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  await prisma.rentCollection.createMany({
    data: [
      {
        tenantId: tenant1.id,
        dueDate: new Date(currentYear, currentMonth, 5),
        amount: 50000,
        status: 'PAID',
        paidAmount: 50000,
        paidDate: new Date(currentYear, currentMonth, 4),
        paymentMethod: 'Bank Transfer',
        assignedToId: staff.id
      },
      {
        tenantId: tenant2.id,
        dueDate: new Date(currentYear, currentMonth, 10),
        amount: 35000,
        status: 'PENDING',
        assignedToId: staff.id
      },
      {
        tenantId: tenant3.id,
        dueDate: new Date(currentYear, currentMonth, 1),
        amount: 75000,
        status: 'PARTIAL',
        paidAmount: 50000,
        paidDate: new Date(currentYear, currentMonth, 2),
        paymentMethod: 'Cash'
      }
    ]
  });
  console.log('Created sample rent collections');

  console.log('Seeding complete!');
  console.log('\nDefault login credentials:');
  console.log('Admin: admin@rentmanager.com / admin123');
  console.log('Staff: staff@rentmanager.com / staff123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
