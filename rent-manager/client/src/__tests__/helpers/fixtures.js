/**
 * Frontend test fixtures
 */

// User fixtures
export const createUserFixture = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'STAFF',
  isActive: true,
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

// Property fixtures
export const createPropertyFixture = (overrides = {}) => ({
  id: 'property-123',
  name: 'Test Property',
  address: '123 Test Street',
  description: 'A test property',
  isActive: true,
  _count: { tenants: 2 },
  ...overrides
});

// Tenant fixtures
export const createTenantFixture = (overrides = {}) => ({
  id: 'tenant-123',
  propertyId: 'property-123',
  name: 'Test Tenant',
  email: 'tenant@example.com',
  phone: '555-1234',
  rentAmount: 1000,
  rentDueDay: 1,
  isActive: true,
  property: { name: 'Test Property' },
  ...overrides
});

// Collection fixtures
export const createCollectionFixture = (overrides = {}) => ({
  id: 'collection-123',
  tenantId: 'tenant-123',
  dueDate: '2024-02-01T00:00:00.000Z',
  amount: 1000,
  lateFee: 0,
  status: 'PENDING',
  paidAmount: 0,
  tenant: {
    name: 'Test Tenant',
    property: { name: 'Test Property' }
  },
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
  createdAt: '2024-01-15T00:00:00.000Z',
  ...overrides
});

// Dashboard summary fixture
export const createDashboardSummaryFixture = (overrides = {}) => ({
  totalExpected: 10000,
  totalCollected: 7500,
  totalPending: 2500,
  collectionRate: 75,
  totalProperties: 5,
  totalTenants: 10,
  overdueCount: 2,
  ...overrides
});

// Report fixtures
export const createCollectionReportFixture = (overrides = {}) => ({
  data: [createCollectionFixture()],
  summary: {
    totalAmount: 1000,
    totalCollected: 0,
    totalPending: 1000
  },
  ...overrides
});
