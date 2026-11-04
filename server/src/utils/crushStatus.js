/**
 * Crush statuses (DEX-50), in the order they're offered. Archived is set by Archive, never picked.
 * Mirrors src/app/core/config/crush-form-options.ts.
 */
const CRUSH_STATUSES = [
  'Undefined', 'Getting Acquainted', 'Friends', 'Friends With Benefits', 'Crush',
  'Dating', 'Lovers', 'Exclusive', 'Engaged', 'Broken Up', 'Archived'
];

/** Retired statuses and what they became. */
const LEGACY_STATUSES = {
  Crushing: 'Crush',
  Plotting: 'Crush',
  Heartbroken: 'Broken Up',
  Friend: 'Friends'
};

/** A status from a client, with retired names swapped for their replacement. */
const normalizeStatus = (status) => (Object.prototype.hasOwnProperty.call(LEGACY_STATUSES, status) ? LEGACY_STATUSES[status] : status);

module.exports = { CRUSH_STATUSES, LEGACY_STATUSES, normalizeStatus };
