const { Resend } = require('resend');

/**
 * A key that is present but obviously a placeholder (the value shipped in
 * .env.example) is treated as unconfigured. Otherwise it takes the real send
 * path, fails against Resend, and in production throws - which would break
 * signup verification with a confusing error instead of an obvious warning.
 */
const isPlaceholderKey = (key) => /^re_x+$/i.test(key.trim());

const sendEmail = async (options) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();

  if (!apiKey || isPlaceholderKey(apiKey)) {
    if (apiKey) {
      console.warn('RESEND_API_KEY is still the placeholder from .env.example - no email will be sent.');
    }
    console.warn('--- EMAIL DEBUG (no RESEND_API_KEY set) ---');
    console.warn(`To: ${options.email}`);
    console.warn(`Subject: ${options.subject}`);
    console.warn(`Message: ${options.message}`);
    console.warn('-------------------------------------------');
    return { success: true, debug: true };
  }

  try {
    const resend = new Resend(apiKey);
    const from = process.env.EMAIL_FROM || 'Dexii Admin <onboarding@resend.dev>';

    const { data, error } = await resend.emails.send({
      from,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    });

    if (error) throw new Error(error.message);

    console.log(`Email sent: ${data.id}`);
    return { success: true };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('--- EMAIL FALLBACK (Resend failed) ---');
      console.warn(`To: ${options.email}`);
      console.warn(`Message: ${options.message}`);
      console.warn('Reason:', error.message);
      console.warn('--------------------------------------');
      return { success: true, debug: true };
    }
    console.error('--- RESEND ERROR ---');
    console.error('Message:', error.message);
    console.error('--------------------');
    throw error;
  }
};

module.exports = sendEmail;
