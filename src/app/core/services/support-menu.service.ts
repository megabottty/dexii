import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SupportMenuService {
  private readonly _open = signal(false);
  readonly open = this._open.asReadonly();

  toggle(): void {
    this._open.update((open) => !open);
  }

  close(): void {
    this._open.set(false);
  }
}
