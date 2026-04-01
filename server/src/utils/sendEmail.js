const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('--- EMAIL DEBUG ---');
    console.warn(`To: ${options.email}`);
    console.warn(`Subject: ${options.subject}`);
    console.warn(`Message: ${options.message}`);
    console.warn('--------------------');
    return { success: true, debug: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Dexii Admin" <${process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('--- SMTP ERROR DETAILS ---');
    console.error('Code:', error.code);
    console.error('Command:', error.command);
    console.error('Response:', error.response);
    console.error('Stack:', error.stack);
    console.error('---------------------------');
    throw error;
  }
};

module.exports = sendEmail;
