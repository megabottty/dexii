import { describe, expect, it } from 'vitest';
import { ModalService } from './modal.service';

describe('ModalService confirm options', () => {
  it('carries a title and button label for a confirm and clears them afterwards', () => {
    const modal = new ModalService();
    let confirmed = false;
    modal.confirm('Delete 3 photos?', () => { confirmed = true; }, undefined, { title: 'Delete photos?', confirmLabel: 'Delete 3', danger: true });
    expect(modal.options()).toEqual({ title: 'Delete photos?', confirmLabel: 'Delete 3', danger: true });
    modal.handleConfirm();
    expect(confirmed).toBe(true);
    expect(modal.options()).toEqual({});
    expect(modal.message()).toBeNull();
  });

  it('does not leak options from a confirm into a plain notice', () => {
    const modal = new ModalService();
    modal.confirm('Sure?', () => undefined, undefined, { danger: true });
    modal.handleCancel();
    modal.show('Saved.');
    expect(modal.options()).toEqual({});
  });
});
