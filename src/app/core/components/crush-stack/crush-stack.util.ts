/** Pure helpers for the deck order (front card first). */

/** The front card goes to the back of the deck. */
export function toBack(order: readonly string[]): string[] {
  if (order.length < 2) return [...order];
  const [front, ...rest] = order;
  return [...rest, front];
}

/** The last card comes to the front. */
export function toFront(order: readonly string[]): string[] {
  if (order.length < 2) return [...order];
  const last = order[order.length - 1];
  return [last, ...order.slice(0, -1)];
}

/**
 * Keeps the deck order when the list changes: cards still present stay where they
 * were, new cards join at the back, removed cards drop out.
 */
export function syncOrder(previous: readonly string[], ids: readonly string[]): string[] {
  const present = new Set(ids);
  const kept = previous.filter((id) => present.has(id));
  const known = new Set(kept);
  return [...kept, ...ids.filter((id) => !known.has(id))];
}
