/**
 * Feed entries for changes to a crush's main status or The Feels (DEX-45, DEX-68).
 * They show on the crush's update timeline and in friends' Feed in The Tea, so friends see
 * "Crush → Dating" or "Feels: Slow burn" without the owner having to post an update.
 */

/** Feels labels tidied for comparing and showing: trimmed, blanks and duplicates removed. */
const cleanLabels = (labels) => [...new Set((Array.isArray(labels) ? labels : []).map((l) => String(l || '').trim()).filter(Boolean))];

/** True when two label lists hold the same labels, in any order. */
const sameLabels = (a, b) => {
  const left = cleanLabels(a).sort();
  const right = cleanLabels(b).sort();
  return left.length === right.length && left.every((label, i) => label === right[i]);
};

/**
 * Works out which feed entries a crush save should create.
 * `before` is the crush as it was, and `after` holds only the fields this save sent.
 * Archiving or restoring a crush, and Feels edits on an archived crush, add nothing,
 * because friends can't see archived crushes (DEX-61).
 *
 * @returns {Array<object>} plain Entry documents, ready for Entry.create
 */
const changeEntriesFor = ({ userId, crush, before = {}, after = {} }) => {
  const entries = [];
  const base = { userId, crushId: String(crush._id), visibility: [], timestamp: new Date() };
  const sent = (field) => Object.prototype.hasOwnProperty.call(after, field);

  // Fall back to the crush itself when the caller didn't pass its old status.
  const oldStatus = before.status ?? crush.status;
  const newStatus = sent('status') ? after.status : oldStatus;
  if (sent('status') && newStatus && newStatus !== oldStatus && ![newStatus, oldStatus].includes('Archived')) {
    // previousStatus lets the Feed say "Crush → Dating", not just "→ Dating".
    entries.push({ ...base, type: 'StatusChange', content: String(newStatus), previousStatus: oldStatus ? String(oldStatus) : undefined });
  }

  if (sent('relationshipLabels') && newStatus !== 'Archived' && !sameLabels(before.relationshipLabels, after.relationshipLabels)) {
    const labels = cleanLabels(after.relationshipLabels);
    entries.push({
      ...base,
      type: 'FeelsChange',
      // content is required on entries, so an empty set of Feels still says something.
      content: labels.length ? labels.join(', ') : 'No Feels',
      labels,
      previousLabels: cleanLabels(before.relationshipLabels)
    });
  }
  return entries;
};

module.exports = { changeEntriesFor, cleanLabels, sameLabels };
