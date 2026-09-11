/**
 * Branded invite email content, styled to match the Pearl theme.
 * Inline styles only - email clients strip <style> blocks.
 */

const PEARL = {
  bg: '#fffafa',
  primary: '#a881af',
  accent: '#d4af37',
  text: '#2b2b2b',
  muted: '#6b6b6b',
  border: '#e7dfe8'
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildInviteEmail = ({ inviterName, inviteUrl, personalMessage }) => {
  const safeInviter = escapeHtml(inviterName || 'A friend');
  const safeUrl = escapeHtml(inviteUrl);
  const safeNote = personalMessage ? escapeHtml(personalMessage) : '';

  const subject = `${inviterName || 'A friend'} invited you to Dexii`;

  const message = [
    `${inviterName || 'A friend'} invited you to join Dexii.`,
    '',
    personalMessage ? `"${personalMessage}"` : '',
    personalMessage ? '' : '',
    'Dexii is a private space for keeping track of your crushes and spilling tea with the people you trust.',
    '',
    `Accept your invite: ${inviteUrl}`,
    '',
    'This invite link is personal to you and expires in 30 days.'
  ].filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n');

  const html = `
  <div style="margin:0;padding:0;background-color:${PEARL.bg};">
    <div style="max-width:520px;margin:0 auto;padding:40px 24px;font-family:Georgia,'Times New Roman',serif;color:${PEARL.text};">

      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;width:56px;height:56px;line-height:56px;border-radius:16px;background:linear-gradient(135deg, ${PEARL.primary}, ${PEARL.accent});color:#ffffff;font-size:28px;font-weight:300;">D</div>
        <div style="margin-top:14px;font-size:26px;font-weight:300;letter-spacing:6px;text-transform:uppercase;">Dexii</div>
      </div>

      <div style="background-color:#ffffff;border:1px solid ${PEARL.border};padding:32px 28px;">
        <p style="margin:0 0 6px 0;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${PEARL.primary};">You're Invited</p>
        <h1 style="margin:0 0 18px 0;font-size:22px;font-weight:400;line-height:1.35;">
          ${safeInviter} wants you on Dexii
        </h1>

        ${safeNote ? `<blockquote style="margin:0 0 20px 0;padding:14px 16px;border-left:3px solid ${PEARL.primary};background-color:${PEARL.bg};font-style:italic;font-size:15px;line-height:1.5;color:${PEARL.text};">${safeNote}</blockquote>` : ''}

        <p style="margin:0 0 26px 0;font-size:15px;line-height:1.6;color:${PEARL.muted};">
          Dexii is a private space for keeping track of your crushes and spilling tea with the people you actually trust.
        </p>

        <div style="text-align:center;margin-bottom:26px;">
          <a href="${safeUrl}"
             style="display:inline-block;background-color:${PEARL.primary};color:#ffffff;text-decoration:none;padding:14px 34px;border-radius:9999px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
            Accept Invite
          </a>
        </div>

        <p style="margin:0;font-size:12px;line-height:1.6;color:${PEARL.muted};text-align:center;">
          Or paste this link into your browser:<br>
          <a href="${safeUrl}" style="color:${PEARL.primary};word-break:break-all;">${safeUrl}</a>
        </p>
      </div>

      <p style="margin:22px 0 0 0;font-size:11px;line-height:1.6;color:${PEARL.muted};text-align:center;">
        This invite is personal to you and expires in 30 days.<br>
        If you weren't expecting it, you can safely ignore this email.
      </p>
    </div>
  </div>`;

  return { subject, message, html };
};

module.exports = { buildInviteEmail };
