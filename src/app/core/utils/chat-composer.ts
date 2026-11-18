/** Tallest the chat typing box grows before it scrolls instead (about 6 lines). */
export const COMPOSER_MAX_HEIGHT_PX = 160;

/**
 * Whether Enter should send the message. With a mouse and a real keyboard
 * (computers), Enter sends and Shift+Enter adds a new line. On touch screens
 * Enter adds a new line and the Send button sends, like other chat apps.
 */
export function composerEnterSends(): boolean {
  try {
    return window.matchMedia('(pointer: fine)').matches;
  } catch {
    // No matchMedia (old browsers or tests): treat it like a computer.
    return true;
  }
}

/**
 * Makes the chat typing box fit what's typed: grows line by line up to
 * COMPOSER_MAX_HEIGHT_PX, then scrolls. Called on every keystroke and after sending.
 */
export function autoGrowComposer(box: HTMLTextAreaElement | null | undefined): void {
  if (!box) return;
  // Shrink first so deleting text makes the box smaller again.
  box.style.height = 'auto';
  box.style.height = `${Math.min(box.scrollHeight, COMPOSER_MAX_HEIGHT_PX)}px`;
  box.style.overflowY = box.scrollHeight > COMPOSER_MAX_HEIGHT_PX ? 'auto' : 'hidden';
}
