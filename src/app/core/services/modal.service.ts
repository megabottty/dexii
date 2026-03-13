import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private _message = signal<string | null>(null);
  public message = this._message.asReadonly();

  show(message: string): void {
    this._message.set(message);
  }

  close(): void {
    this._message.set(null);
  }
}
