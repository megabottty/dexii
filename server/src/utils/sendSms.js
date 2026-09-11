/**
 * SMS delivery with graceful degradation.
 *
 * When Twilio credentials are configured the message is sent server-side.
 * Otherwise we return a `sms:` deep link so the client can hand off to the
 * user's own messaging app, which keeps invites working at zero cost.
 */

const hasTwilioCredentials = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

const buildSmsUrl = (phone, message) => {
  const to = encodeURIComponent(phone || '');
  const body = encodeURIComponent(message || '');
  return `sms:${to}?&body=${body}`;
};

const sendSms = async ({ phone, message }) => {
  if (!hasTwilioCredentials()) {
    return { success: true, delivery: 'handoff', smsUrl: buildSmsUrl(phone, message) };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const auth = Buffer.from(`${accountSid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_FROM_NUMBER,
    Body: message
  });

  try {
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!response.ok) {
      const detail = await response.json().catch(() => null);
      throw new Error(detail?.message || `Twilio responded ${response.status}`);
    }

    return { success: true, delivery: 'sent' };
  } catch (error) {
    // Never fail the invite outright - fall back to letting the user send it themselves.
    console.warn('Twilio send failed, falling back to device handoff:', error.message);
    return { success: true, delivery: 'handoff', smsUrl: buildSmsUrl(phone, message), warning: error.message };
  }
};

module.exports = sendSms;
module.exports.hasTwilioCredentials = hasTwilioCredentials;
module.exports.buildSmsUrl = buildSmsUrl;
