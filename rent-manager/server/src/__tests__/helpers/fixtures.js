/**
 * Test data fixtures for unit tests
 */

// User fixtures
export const createUserFixture = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  password: '$2a$10$hashedpassword', // bcrypt hash of 'password123'
  role: 'STAFF',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

export const createAdminFixture = (overrides = {}) =>
  createUserFixture({
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
    ...overrides
  });

export const createStaffFixture = (overrides = {}) =>
  createUserFixture({
    id: 'staff-123',
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'STAFF',
    ...overrides
  });

// Property fixtures
export const createPropertyFixture = (overrides = {}) => ({
  id: 'property-123',
  name: 'Test Property',
  address: '123 Test Street',
  description: 'A test property',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Tenant fixtures
export const createTenantFixture = (overrides = {}) => ({
  id: 'tenant-123',
  propertyId: 'property-123',
  name: 'Test Tenant',
  email: 'tenant@example.com',
  phone: '555-1234',
  leaseStartDate: new Date('2024-01-01'),
  leaseEndDate: new Date('2024-12-31'),
  rentAmount: 1000,
  depositAmount: 2000,
  rentDueDay: 1,
  lateFeePercentage: 5,
  notes: 'Test tenant notes',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides
});

// Rent Collection fixtures
export const createCollectionFixture = (overrides = {}) => ({
  id: 'collection-123',
  tenantId: 'tenant-123',
  assignedToId: null,
  dueDate: new Date('2024-02-01'),
  amount: 1000,
  lateFee: 0,
  status: 'PENDING',
  paidAmount: 0,
  paidDate: null,
  paymentMethod: null,
  notes: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-15'),
  ...overrides
});

export const createPaidCollectionFixture = (overrides = {}) =>
  createCollectionFixture({
    id: 'paid-collection-123',
    status: 'PAID',
    paidAmount: 1000,
    paidDate: new Date('2024-02-01'),
    paymentMethod: 'CASH',
    ...overrides
  });

export const createPartialCollectionFixture = (overrides = {}) =>
  createCollectionFixture({
    id: 'partial-collection-123',
    status: 'PARTIAL',
    paidAmount: 500,
    paidDate: new Date('2024-02-01'),
    paymentMethod: 'CASH',
    ...overrides
  });

export const createOverdueCollectionFixture = (overrides = {}) =>
  createCollectionFixture({
    id: 'overdue-collection-123',
    dueDate: new Date('2024-01-01'), // Past date
    status: 'OVERDUE',
    lateFee: 50,
    ...overrides
  });

// Notification fixtures
export const createNotificationFixture = (overrides = {}) => ({
  id: 'notification-123',
  userId: 'user-123',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'INFO',
  isRead: false,
  createdAt: new Date('2024-01-15'),
  ...overrides
});

// Reminder Log fixtures
export const createReminderLogFixture = (overrides = {}) => ({
  id: 'reminder-log-123',
  rentCollectionId: 'collection-123',
  reminderType: 'THREE_DAY',
  sentAt: new Date('2024-01-29'),
  sentViaEmail: true,
  sentViaApp: true,
  ...overrides
});

// Request body fixtures
export const createLoginRequestFixture = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  ...overrides
});

export const createRegisterRequestFixture = (overrides = {}) => ({
  email: 'newuser@example.com',
  password: 'password123',
  name: 'New User',
  ...overrides
});

export const createPropertyRequestFixture = (overrides = {}) => ({
  name: 'New Property',
  address: '456 New Street',
  description: 'A new property',
  ...overrides
});

export const createTenantRequestFixture = (overrides = {}) => ({
  propertyId: 'property-123',
  name: 'New Tenant',
  email: 'newtenant@example.com',
  phone: '555-5678',
  rentAmount: 1200,
  rentDueDay: 1,
  ...overrides
});

export const createCollectionRequestFixture = (overrides = {}) => ({
  tenantId: 'tenant-123',
  dueDate: '2024-03-01',
  amount: 1000,
  ...overrides
});

export const createPaymentRequestFixture = (overrides = {}) => ({
  amount: 500,
  paymentMethod: 'CASH',
  notes: 'Partial payment',
  ...overrides
});
