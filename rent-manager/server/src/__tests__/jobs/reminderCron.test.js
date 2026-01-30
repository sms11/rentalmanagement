import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { prismaMock } from '../helpers/prismaMock.js';
import { fixtures } from '../helpers/fixtures.js';

// Mock email service
const mockSendRentReminder = jest.fn();
jest.unstable_mockModule('../../services/emailService.js', () => ({
  initEmailService: jest.fn(),
  sendRentReminder: mockSendRentReminder
}));

// Mock node-cron
jest.unstable_mockModule('node-cron', () => ({
  default: {
    schedule: jest.fn()
  }
}));

// Import after mocking
const { processReminders, updateOverdueStatus, getReminderType, triggerReminders } = await import('../../jobs/reminderCron.js');

describe('Reminder Cron Job', () => {
  let testCollection;
  let testTenant;
  let testProperty;
  let adminUser;

  beforeEach(() => {
    jest.clearAllMocks();

    adminUser = fixtures.createUser({ role: 'ADMIN' });
    testProperty = fixtures.createProperty();
    testTenant = fixtures.createTenant({ propertyId: testProperty.id, email: 'tenant@test.com' });
    testCollection = fixtures.createCollection({
      tenantId: testTenant.id,
      status: 'PENDING'
    });
  });

  describe('getReminderType', () => {
    it('should return SEVEN_DAY for 7 days', () => {
      expect(getReminderType(7)).toBe('SEVEN_DAY');
    });

    it('should return THREE_DAY for 3 days', () => {
      expect(getReminderType(3)).toBe('THREE_DAY');
    });

    it('should return ONE_DAY for 1 day', () => {
      expect(getReminderType(1)).toBe('ONE_DAY');
    });

    it('should return DUE_DAY for 0 days', () => {
      expect(getReminderType(0)).toBe('DUE_DAY');
    });

    it('should return null for invalid days', () => {
      expect(getReminderType(5)).toBeNull();
      expect(getReminderType(-1)).toBeNull();
    });
  });

  describe('updateOverdueStatus', () => {
    it('should mark past due collections as OVERDUE', async () => {
      prismaMock.rentCollection.updateMany.mockResolvedValue({ count: 3 });

      await updateOverdueStatus();

      expect(prismaMock.rentCollection.updateMany).toHaveBeenCalledWith({
        where: {
          dueDate: { lt: expect.any(Date) },
          status: { in: ['PENDING', 'PARTIAL'] }
        },
        data: { status: 'OVERDUE' }
      });
    });
  });

  describe('processReminders', () => {
    it('should find collections due on reminder days', async () => {
      const collectionWithRelations = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null,
        reminderLogs: []
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithRelations]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.reminderLog.create.mockResolvedValue({});
      mockSendRentReminder.mockResolvedValue(true);

      await processReminders();

      expect(prismaMock.rentCollection.findMany).toHaveBeenCalled();
    });

    it('should skip if reminder already sent', async () => {
      const collectionWithReminder = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null,
        reminderLogs: [{ reminderType: 'SEVEN_DAY' }]
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithReminder]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);

      await processReminders();

      // Should not create new reminder log for this type
      expect(prismaMock.reminderLog.create).not.toHaveBeenCalled();
    });

    it('should send email to tenant if email exists', async () => {
      const collectionWithRelations = {
        ...testCollection,
        tenant: { ...testTenant, email: 'tenant@test.com', property: testProperty },
        assignedTo: null,
        reminderLogs: []
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithRelations]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.reminderLog.create.mockResolvedValue({});
      mockSendRentReminder.mockResolvedValue(true);

      await processReminders();

      expect(mockSendRentReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantEmail: 'tenant@test.com',
          tenantName: testTenant.name
        })
      );
    });

    it('should create notification for assigned staff', async () => {
      const staffUser = fixtures.createUser({ id: 'staff-1', role: 'STAFF' });
      const collectionWithStaff = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: staffUser,
        reminderLogs: []
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithStaff]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.reminderLog.create.mockResolvedValue({});
      mockSendRentReminder.mockResolvedValue(true);

      await processReminders();

      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: staffUser.id
          })
        })
      );
    });

    it('should notify all admins', async () => {
      const collectionWithRelations = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null,
        reminderLogs: []
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithRelations]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.reminderLog.create.mockResolvedValue({});
      mockSendRentReminder.mockResolvedValue(true);

      await processReminders();

      expect(prismaMock.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: adminUser.id,
            type: 'REMINDER'
          })
        })
      );
    });

    it('should log reminder after sending', async () => {
      const collectionWithRelations = {
        ...testCollection,
        tenant: { ...testTenant, property: testProperty },
        assignedTo: null,
        reminderLogs: []
      };

      prismaMock.rentCollection.findMany.mockResolvedValue([collectionWithRelations]);
      prismaMock.user.findMany.mockResolvedValue([adminUser]);
      prismaMock.notification.create.mockResolvedValue({});
      prismaMock.reminderLog.create.mockResolvedValue({});
      mockSendRentReminder.mockResolvedValue(true);

      await processReminders();

      expect(prismaMock.reminderLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rentCollectionId: testCollection.id,
            sentViaEmail: true,
            sentViaApp: true
          })
        })
      );
    });
  });

  describe('triggerReminders', () => {
    it('should call both updateOverdueStatus and processReminders', async () => {
      prismaMock.rentCollection.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.rentCollection.findMany.mockResolvedValue([]);
      prismaMock.user.findMany.mockResolvedValue([]);

      await triggerReminders();

      expect(prismaMock.rentCollection.updateMany).toHaveBeenCalled();
      expect(prismaMock.rentCollection.findMany).toHaveBeenCalled();
    });
  });
});
