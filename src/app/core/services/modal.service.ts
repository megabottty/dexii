import { Injectable, signal } from '@angular/core';

export type ModalType = 'alert' | 'confirm' | 'prompt';

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

  private _onConfirm: ((value?: string) => void) | null = null;
  private _onCancel: (() => void) | null = null;

  show(message: string): void {
    this._type.set('alert');
    this._message.set(message);
    this._onConfirm = null;
    this._onCancel = null;
  }

  confirm(message: string, onConfirm: () => void, onCancel?: () => void): void {
    this._type.set('confirm');
    this._message.set(message);
    this._onConfirm = onConfirm;
    this._onCancel = onCancel || null;
  }

  prompt(message: string, defaultValue: string, onConfirm: (value: string) => void, onCancel?: () => void): void {
    this._type.set('prompt');
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

  close(): void {
    this._message.set(null);
  }
}
