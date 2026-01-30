import { http, HttpResponse } from 'msw';

const API_URL = '/api';

// Test data
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'STAFF',
  isActive: true
};

export const mockAdmin = {
  id: 'admin-123',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  isActive: true
};

export const mockProperty = {
  id: 'property-123',
  name: 'Test Property',
  address: '123 Test Street',
  description: 'A test property',
  isActive: true,
  _count: { tenants: 2 }
};

export const mockTenant = {
  id: 'tenant-123',
  propertyId: 'property-123',
  name: 'Test Tenant',
  email: 'tenant@example.com',
  phone: '555-1234',
  rentAmount: 1000,
  rentDueDay: 1,
  isActive: true,
  property: { name: 'Test Property' }
};

export const mockCollection = {
  id: 'collection-123',
  tenantId: 'tenant-123',
  dueDate: '2024-02-01T00:00:00.000Z',
  amount: 1000,
  lateFee: 0,
  status: 'PENDING',
  paidAmount: 0,
  tenant: { name: 'Test Tenant', property: { name: 'Test Property' } }
};

export const mockNotification = {
  id: 'notification-123',
  userId: 'user-123',
  title: 'Test Notification',
  message: 'This is a test notification',
  type: 'INFO',
  isRead: false,
  createdAt: '2024-01-15T00:00:00.000Z'
};

// Default handlers
export const handlers = [
  // Auth handlers
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({ user: mockUser, token: 'test-token' });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }),

  http.post(`${API_URL}/auth/register`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      user: { ...mockUser, name: body.name, email: body.email },
      token: 'test-token'
    });
  }),

  http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({ user: mockUser });
  }),

  http.put(`${API_URL}/auth/change-password`, async ({ request }) => {
    const body = await request.json();
    if (body.currentPassword === 'password123') {
      return HttpResponse.json({ message: 'Password changed successfully' });
    }
    return HttpResponse.json({ error: 'Incorrect current password' }, { status: 400 });
  }),

  // Users handlers
  http.get(`${API_URL}/users`, () => {
    return HttpResponse.json([mockUser, mockAdmin]);
  }),

  http.get(`${API_URL}/users/staff`, () => {
    return HttpResponse.json([mockUser]);
  }),

  http.post(`${API_URL}/users`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-user-123', ...body, isActive: true });
  }),

  http.put(`${API_URL}/users/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ...mockUser, ...body });
  }),

  http.delete(`${API_URL}/users/:id`, () => {
    return HttpResponse.json({ message: 'User deleted' });
  }),

  // Properties handlers
  http.get(`${API_URL}/properties`, () => {
    return HttpResponse.json([mockProperty]);
  }),

  http.get(`${API_URL}/properties/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockProperty, id: params.id, tenants: [mockTenant] });
  }),

  http.post(`${API_URL}/properties`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-property-123', ...body, isActive: true });
  }),

  http.put(`${API_URL}/properties/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ...mockProperty, ...body });
  }),

  http.delete(`${API_URL}/properties/:id`, () => {
    return HttpResponse.json({ message: 'Property deleted' });
  }),

  // Tenants handlers
  http.get(`${API_URL}/tenants`, () => {
    return HttpResponse.json([mockTenant]);
  }),

  http.get(`${API_URL}/tenants/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockTenant, id: params.id, collections: [mockCollection] });
  }),

  http.post(`${API_URL}/tenants`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-tenant-123', ...body, isActive: true });
  }),

  http.put(`${API_URL}/tenants/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ...mockTenant, ...body });
  }),

  http.delete(`${API_URL}/tenants/:id`, () => {
    return HttpResponse.json({ message: 'Tenant deleted' });
  }),

  // Collections handlers
  http.get(`${API_URL}/collections`, () => {
    return HttpResponse.json([mockCollection]);
  }),

  http.get(`${API_URL}/collections/my/assigned`, () => {
    return HttpResponse.json([mockCollection]);
  }),

  http.get(`${API_URL}/collections/:id`, ({ params }) => {
    return HttpResponse.json({ ...mockCollection, id: params.id });
  }),

  http.post(`${API_URL}/collections`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: 'new-collection-123', ...body, status: 'PENDING' });
  }),

  http.post(`${API_URL}/collections/generate`, () => {
    return HttpResponse.json({ created: 5, skipped: 2 });
  }),

  http.put(`${API_URL}/collections/:id`, async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ id: params.id, ...mockCollection, ...body });
  }),

  http.put(`${API_URL}/collections/:id/pay`, async ({ request, params }) => {
    const body = await request.json();
    const newPaidAmount = mockCollection.paidAmount + body.amount;
    const totalDue = mockCollection.amount + mockCollection.lateFee;
    const status = newPaidAmount >= totalDue ? 'PAID' : 'PARTIAL';
    return HttpResponse.json({
      ...mockCollection,
      id: params.id,
      paidAmount: newPaidAmount,
      status,
      paidDate: new Date().toISOString()
    });
  }),

  http.delete(`${API_URL}/collections/:id`, () => {
    return HttpResponse.json({ message: 'Collection deleted' });
  }),

  // Dashboard handlers
  http.get(`${API_URL}/dashboard/summary`, () => {
    return HttpResponse.json({
      totalExpected: 10000,
      totalCollected: 7500,
      totalPending: 2500,
      collectionRate: 75,
      totalProperties: 5,
      totalTenants: 10,
      overdueCount: 2
    });
  }),

  http.get(`${API_URL}/dashboard/trend`, () => {
    return HttpResponse.json([
      { month: '2024-01', expected: 10000, collected: 8000 },
      { month: '2024-02', expected: 10000, collected: 7500 }
    ]);
  }),

  http.get(`${API_URL}/dashboard/upcoming`, () => {
    return HttpResponse.json([mockCollection]);
  }),

  http.get(`${API_URL}/dashboard/overdue`, () => {
    return HttpResponse.json([{ ...mockCollection, status: 'OVERDUE', lateFee: 50 }]);
  }),

  // Reports handlers
  http.get(`${API_URL}/reports/collections`, () => {
    return HttpResponse.json({
      data: [mockCollection],
      summary: { totalAmount: 1000, totalCollected: 0, totalPending: 1000 }
    });
  }),

  http.get(`${API_URL}/reports/tenants`, () => {
    return HttpResponse.json({
      data: [{ ...mockTenant, totalCollections: 12, totalPaid: 10000, balance: 1000 }]
    });
  }),

  http.get(`${API_URL}/reports/properties`, () => {
    return HttpResponse.json({
      data: [{ ...mockProperty, totalExpected: 12000, totalCollected: 10000, collectionRate: 83 }]
    });
  }),

  // Notifications handlers
  http.get(`${API_URL}/notifications`, () => {
    return HttpResponse.json([mockNotification]);
  }),

  http.get(`${API_URL}/notifications/unread-count`, () => {
    return HttpResponse.json({ count: 3 });
  }),

  http.put(`${API_URL}/notifications/:id/read`, ({ params }) => {
    return HttpResponse.json({ ...mockNotification, id: params.id, isRead: true });
  }),

  http.put(`${API_URL}/notifications/read-all`, () => {
    return HttpResponse.json({ message: 'All notifications marked as read' });
  }),

  http.delete(`${API_URL}/notifications/:id`, () => {
    return HttpResponse.json({ message: 'Notification deleted' });
  }),

  http.delete(`${API_URL}/notifications`, () => {
    return HttpResponse.json({ message: 'All notifications cleared' });
  })
];

export default handlers;
