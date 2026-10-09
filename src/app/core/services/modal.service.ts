import { Injectable, signal } from '@angular/core';

export type ModalType = 'alert' | 'confirm' | 'prompt';

/** Dressing for a confirm dialog: a real title and a button that says what it does. */
export interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive: the confirm button is outlined red instead of filled with the theme colour. */
  danger?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private _message = signal<string | null>(null);
  public message = this._message.asReadonly();

  private _type = signal<ModalType>('alert');
  public type = this._type.asReadonly();

  private _promptValue = signal<string>('');
  public promptValue = this._promptValue;

  private _options = signal<ConfirmOptions>({});
  public options = this._options.asReadonly();

  private _onConfirm: ((value?: string) => void) | null = null;
  private _onCancel: (() => void) | null = null;

  show(message: string): void {
    this._type.set('alert');
    this._options.set({});
    this._message.set(message);
    this._onConfirm = null;
    this._onCancel = null;
  }

  confirm(message: string, onConfirm: () => void, onCancel?: () => void, options: ConfirmOptions = {}): void {
    this._type.set('confirm');
    this._options.set(options);
    this._message.set(message);
    this._onConfirm = onConfirm;
    this._onCancel = onCancel || null;
  }

  prompt(message: string, defaultValue: string, onConfirm: (value: string) => void, onCancel?: () => void): void {
    this._type.set('prompt');
    this._options.set({});
    this._message.set(message);
    this._promptValue.set(defaultValue);
    this._onConfirm = onConfirm as (value?: string) => void;
    this._onCancel = onCancel || null;
  }

  handleConfirm(): void {
    const callback = this._onConfirm;
    const value = this._promptValue();
    this.close();
    if (callback) {
      callback(value);
    }
  }

  handleCancel(): void {
    const callback = this._onCancel;
    this.close();
    if (callback) {
      callback();
    }
  }

  // Callbacks are cleared here so a dismissed modal can never re-invoke a stale
  // handler, which previously allowed one action to be recorded twice.
  close(): void {
    this._message.set(null);
    this._options.set({});
    this._onConfirm = null;
    this._onCancel = null;
  }
}
