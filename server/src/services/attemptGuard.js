/**
 * Wrong-guess limits for the PIN and emailed codes. Kept on the account in Mongo, so the
 * limit holds across server restarts and for every IP address.
 */
const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const isLocked = (state, now = new Date()) => !!state?.lockedUntil && new Date(state.lockedUntil) > now;

/** The attempt state after one more wrong guess; the limit locks the account for LOCK_MINUTES. */
const afterFailure = (state, now = new Date()) => {
  const count = (isLocked(state, now) ? 0 : Number(state?.count) || 0) + 1;
  return count >= MAX_FAILURES
    ? { count: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60 * 1000) }
    : { count, lockedUntil: null };
};

const LOCKED_MESSAGE = `Too many tries. Try again in ${LOCK_MINUTES} minutes.`;

/** Saves a wrong guess of this kind ('pin', 'reset', 'verify') on the account. */
const recordFailure = async (User, user, kind) => {
  const next = afterFailure(user.securityAttempts?.[kind]);
  await User.updateOne({ _id: user._id }, { $set: { [`securityAttempts.${kind}`]: next } });
};

const clearFailures = async (User, user, kind) => {
  if (!user.securityAttempts?.[kind]) return;
  await User.updateOne({ _id: user._id }, { $unset: { [`securityAttempts.${kind}`]: '' } });
};

module.exports = { MAX_FAILURES, LOCK_MINUTES, LOCKED_MESSAGE, isLocked, afterFailure, recordFailure, clearFailures };
