/**
 * A crush's customNotes holds the "Other" detail notes (hair, eyes, build, relationship) and,
 * on older crushes, the owner's private notes. Mirrors parseCustomNotes in crush-form.util.ts.
 */
const NOTE_KIND_LABELS = ['Hair', 'Eyes', 'Build', 'Relationship'];

const isDetailLine = (line) => NOTE_KIND_LABELS.some((label) => line.startsWith(`Other: ${label} - `) || line.startsWith(`${label}:`));

/** Only the detail lines: what a friend may see (DEX-42). */
const friendSafeNotes = (notes) => String(notes || '').split('\n').filter(isDetailLine).join('\n');

/** Only the owner's private notes. */
const privateNotesOf = (notes) => String(notes || '').split('\n').filter((line) => !isDetailLine(line)).join('\n').trim();

module.exports = { friendSafeNotes, privateNotesOf };
