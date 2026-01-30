import cron from 'node-cron';
import prisma from '../config/db.js';
import { initEmailService, sendRentReminder } from '../services/emailService.js';

const REMINDER_DAYS = [7, 3, 1, 0]; // Days before due date to send reminders

const getReminderType = (days) => {
  switch (days) {
    case 7: return 'SEVEN_DAY';
    case 3: return 'THREE_DAY';
    case 1: return 'ONE_DAY';
    case 0: return 'DUE_DAY';
    default: return null;
  }
};

export const processReminders = async () => {
  console.log('Processing rent reminders...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const daysUntilDue of REMINDER_DAYS) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + daysUntilDue);

    const reminderType = getReminderType(daysUntilDue);

    // Find collections due on target date that haven't been paid
    const collections = await prisma.rentCollection.findMany({
      where: {
        dueDate: {
          gte: new Date(targetDate.setHours(0, 0, 0, 0)),
          lt: new Date(targetDate.setHours(23, 59, 59, 999))
        },
        status: { in: ['PENDING', 'PARTIAL'] }
      },
      include: {
        tenant: {
          include: {
            property: true
          }
        },
        assignedTo: true,
        reminderLogs: {
          where: { reminderType }
        }
      }
    });

    for (const collection of collections) {
      // Skip if reminder already sent for this type
      if (collection.reminderLogs.length > 0) {
        continue;
      }

      let sentViaEmail = false;
      let sentViaApp = false;

      // Send email to tenant if they have an email
      if (collection.tenant.email) {
        sentViaEmail = await sendRentReminder({
          tenantEmail: collection.tenant.email,
          tenantName: collection.tenant.name,
          propertyName: collection.tenant.property.name,
          amount: collection.amount - collection.paidAmount,
          dueDate: collection.dueDate,
          daysUntilDue
        });
      }

      // Create in-app notification for assigned staff or all admins
      const notifyUsers = [];

      if (collection.assignedTo) {
        notifyUsers.push(collection.assignedTo.id);
      }

      // Also notify all admins
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true }
      });
      admins.forEach(admin => {
        if (!notifyUsers.includes(admin.id)) {
          notifyUsers.push(admin.id);
        }
      });

      for (const userId of notifyUsers) {
        await prisma.notification.create({
          data: {
            userId,
            title: daysUntilDue === 0 ? 'Rent Due Today' : `Rent Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`,
            message: `${collection.tenant.name} - ${collection.tenant.property.name}: NPR ${(collection.amount - collection.paidAmount).toLocaleString()}`,
            type: 'REMINDER'
          }
        });
        sentViaApp = true;
      }

      // Log the reminder
      await prisma.reminderLog.create({
        data: {
          rentCollectionId: collection.id,
          reminderType,
          sentViaEmail,
          sentViaApp
        }
      });

      console.log(`Sent ${reminderType} reminder for collection ${collection.id}`);
    }
  }

  console.log('Reminder processing complete');
};

export const updateOverdueStatus = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Update all overdue collections
  await prisma.rentCollection.updateMany({
    where: {
      dueDate: { lt: today },
      status: { in: ['PENDING', 'PARTIAL'] }
    },
    data: { status: 'OVERDUE' }
  });
};

export const startReminderCron = () => {
  // Initialize email service
  initEmailService();

  // Run every day at 8:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      await updateOverdueStatus();
      await processReminders();
    } catch (error) {
      console.error('Error in reminder cron job:', error);
    }
  });

  console.log('Reminder cron job scheduled for 8:00 AM daily');

  // Also run once on startup (optional - comment out if not needed)
  // setTimeout(async () => {
  //   await updateOverdueStatus();
  //   await processReminders();
  // }, 5000);
};

// Manual trigger endpoint helper
export const triggerReminders = async () => {
  await updateOverdueStatus();
  await processReminders();
};
