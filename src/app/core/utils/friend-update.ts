import { Entry } from '../models/entry.model';

/**
 * An Update For Friends (DEX-44): everyone the crush is shared with sees it. Older notes that
 * were shared with someone, or marked Public, count as updates too; private notes never do.
 */
export function isFriendUpdate(entry: Pick<Entry, 'type' | 'visibility'>): boolean {
  if (entry.type === 'Update') return true;
  return entry.type === 'Note' && Array.isArray(entry.visibility) && entry.visibility.length > 0;
}

/** A note only you can see (these move to the Vault in DEX-43). */
export function isPrivateNote(entry: Pick<Entry, 'type' | 'visibility'>): boolean {
  return entry.type === 'Note' && !isFriendUpdate(entry);
}

export const SHARE_UPDATE_CONFIRM_TITLE = 'Send update?';
export const SHARE_UPDATE_CONFIRM_TEXT = "Updates are automatically added to friends' feeds that you are sharing this crush with.";
