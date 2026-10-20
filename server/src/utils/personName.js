/**
 * What to call a user in front of their friends: the display name they chose in
 * Settings, else their first and last name, else their @username.
 *
 * A display name that merely repeats the username (the Settings default) doesn't
 * count as chosen, so a real name still wins over it when there is one.
 */
const personName = (user, fallback = 'A friend') => {
  if (!user) return fallback;
  const username = String(user.username || '').trim();
  const chosen = String(user.displayName || user.profileSettings?.displayName || '').trim();
  if (chosen && chosen.toLowerCase() !== username.toLowerCase()) return chosen;
  const full = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return full || username || fallback;
};

module.exports = { personName };
