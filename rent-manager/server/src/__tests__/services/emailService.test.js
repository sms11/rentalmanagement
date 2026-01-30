import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock nodemailer before importing the service
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail
}));

jest.unstable_mockModule('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  }
}));

// Import after mocking
const { initEmailService, sendEmail, sendRentReminder, sendAssignmentNotification } = await import('../../services/emailService.js');

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
  });

  describe('initEmailService', () => {
    it('should initialize with valid credentials', () => {
      initEmailService();

      expect(mockCreateTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        }
      });
    });

    it('should not initialize without credentials', () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;

      // Should not throw
      expect(() => initEmailService()).not.toThrow();
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      initEmailService();
    });

    it('should send email with correct parameters', async () => {
      mockSendMail.mockResolvedValue({ messageId: '123' });

      const result = await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'test@gmail.com',
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>'
      });
    });

    it('should return false on failure', async () => {
      mockSendMail.mockRejectedValue(new Error('Failed to send'));

      const result = await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test',
        text: 'Test'
      });

      expect(result).toBe(false);
    });
  });

  describe('sendRentReminder', () => {
    beforeEach(() => {
      initEmailService();
      mockSendMail.mockResolvedValue({ messageId: '123' });
    });

    it('should send reminder with correct subject for 7 days', async () => {
      const result = await sendRentReminder({
        tenantEmail: 'tenant@test.com',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15'),
        daysUntilDue: 7
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'tenant@test.com',
          subject: expect.stringContaining('7 days')
        })
      );
    });

    it('should send reminder with correct subject for 1 day', async () => {
      await sendRentReminder({
        tenantEmail: 'tenant@test.com',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15'),
        daysUntilDue: 1
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('tomorrow')
        })
      );
    });

    it('should send reminder with correct subject for due day', async () => {
      await sendRentReminder({
        tenantEmail: 'tenant@test.com',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15'),
        daysUntilDue: 0
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('today')
        })
      );
    });

    it('should format amount with NPR currency', async () => {
      await sendRentReminder({
        tenantEmail: 'tenant@test.com',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15'),
        daysUntilDue: 3
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('NPR')
        })
      );
    });
  });

  describe('sendAssignmentNotification', () => {
    beforeEach(() => {
      initEmailService();
      mockSendMail.mockResolvedValue({ messageId: '123' });
    });

    it('should send assignment notification', async () => {
      const result = await sendAssignmentNotification({
        staffEmail: 'staff@test.com',
        staffName: 'Staff Member',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15')
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'staff@test.com',
          subject: expect.stringContaining('Collection Assigned')
        })
      );
    });

    it('should include tenant and property info in email', async () => {
      await sendAssignmentNotification({
        staffEmail: 'staff@test.com',
        staffName: 'Staff Member',
        tenantName: 'John Doe',
        propertyName: 'Test Property',
        amount: 15000,
        dueDate: new Date('2024-06-15')
      });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringMatching(/John Doe.*Test Property/s)
        })
      );
    });
  });
});
