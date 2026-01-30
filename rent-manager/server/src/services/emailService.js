import nodemailer from 'nodemailer';

let transporter = null;

export const initEmailService = () => {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Email service not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
    return false;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  return true;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    console.warn('Email service not initialized');
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Rent Manager" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text
    });
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

export const sendRentReminder = async ({ tenantEmail, tenantName, propertyName, amount, dueDate, daysUntilDue }) => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = daysUntilDue === 0
    ? `Rent Due Today - ${propertyName}`
    : `Rent Reminder: Due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''} - ${propertyName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Rent Payment Reminder</h2>
      <p>Dear ${tenantName},</p>
      <p>This is a friendly reminder that your rent payment is ${daysUntilDue === 0 ? '<strong>due today</strong>' : `due in <strong>${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}</strong>`}.</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Amount Due:</strong> NPR ${amount.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      </div>
      <p>Please ensure timely payment to avoid any late fees.</p>
      <p>Thank you for your cooperation.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Rent Manager.</p>
    </div>
  `;

  const text = `
Rent Payment Reminder

Dear ${tenantName},

This is a friendly reminder that your rent payment is ${daysUntilDue === 0 ? 'due today' : `due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}`}.

Property: ${propertyName}
Amount Due: NPR ${amount.toLocaleString()}
Due Date: ${formattedDate}

Please ensure timely payment to avoid any late fees.

Thank you for your cooperation.
  `;

  return sendEmail({ to: tenantEmail, subject, html, text });
};

export const sendAssignmentNotification = async ({ staffEmail, staffName, tenantName, propertyName, amount, dueDate }) => {
  const formattedDate = new Date(dueDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `New Collection Assignment - ${tenantName}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Collection Assignment</h2>
      <p>Dear ${staffName},</p>
      <p>You have been assigned to collect rent from the following tenant:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Tenant:</strong> ${tenantName}</p>
        <p style="margin: 5px 0;"><strong>Property:</strong> ${propertyName}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> NPR ${amount.toLocaleString()}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${formattedDate}</p>
      </div>
      <p>Please ensure timely collection.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">This is an automated message from Rent Manager.</p>
    </div>
  `;

  return sendEmail({ to: staffEmail, subject, html });
};
