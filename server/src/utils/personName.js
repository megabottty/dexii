/**
 * What to call a user in front of their friends: the display name they chose in
 * Settings, else their first and last name, else their @username.
 *
 * A display name that merely repeats the username (the Settings default) doesn't
 * count as chosen, so a real name still wins over it when there is one. An email
 * address is never anyone's name, so one in either field is skipped.
 */
const notEmail = (value) => { const text = String(value || '').trim(); return text.includes('@') ? '' : text; };

const personName = (user, fallback = 'A friend') => {
  if (!user) return fallback;
  const username = notEmail(user.username);
  const chosen = notEmail(user.displayName || user.profileSettings?.displayName);
  if (chosen && chosen.toLowerCase() !== username.toLowerCase()) return chosen;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || username || fallback;
};

module.exports = { personName };
