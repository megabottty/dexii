import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';

/**
 * One answer to "is the page still loading?". Pages register their loading signal with `bindHere`
 * and the router reports navigations; `app-loading-overlay` shows a centred spinner over a dimmed
 * page while any of them is true.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly sources = signal<ReadonlyArray<Signal<boolean>>>([]);
  private readonly navigating = signal(false);

  readonly active = computed(() => this.navigating() || this.sources().some((source) => source()));

  /** Adds a loading signal; returns the matching remove. */
  bind(source: Signal<boolean>): () => void {
    this.sources.update((list) => [...list, source]);
    return () => this.sources.update((list) => list.filter((item) => item !== source));
  }

  /** `bind` for a component field initializer or constructor: unbinds when the component is destroyed. */
  bindHere(source: Signal<boolean>): void {
    inject(DestroyRef).onDestroy(this.bind(source));
  }

  setNavigating(on: boolean): void {
    this.navigating.set(on);
  }
}
