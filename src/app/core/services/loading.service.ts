import { DestroyRef, Injectable, Signal, computed, inject, signal } from '@angular/core';

/** How the overlay looks: the Stash asks for its 💖 spinner and its own words. */
export interface LoadingLook {
  heart?: boolean;
  label?: Signal<string>;
}

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

  private readonly looks = signal<ReadonlyArray<LoadingLook>>([]);
  /** The look asked for by the most recently opened page, if any. */
  readonly look = computed<LoadingLook>(() => this.looks().at(-1) ?? {});

  /** For a page's field initializer or constructor: the overlay uses this look until the page closes. */
  useLookHere(look: LoadingLook): void {
    this.looks.update((list) => [...list, look]);
    inject(DestroyRef).onDestroy(() => this.looks.update((list) => list.filter((item) => item !== look)));
  }

  setNavigating(on: boolean): void {
    this.navigating.set(on);
  }
}
