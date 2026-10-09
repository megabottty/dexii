import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, output } from '@angular/core';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps keyboard focus inside a dialog while it is open: moves focus in when it
 * appears, wraps Tab / Shift+Tab at the edges, reports Escape, and puts focus
 * back where it was when the dialog goes away.
 */
@Directive({ selector: '[appFocusTrap]', standalone: true, host: { '(keydown)': 'onKeydown($event)' } })
export class FocusTrapDirective implements AfterViewInit, OnDestroy {
  readonly escaped = output<void>();
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previouslyFocused: HTMLElement | null = null;

  ngAfterViewInit(): void {
    this.previouslyFocused = (document.activeElement as HTMLElement | null) ?? null;
    const el = this.host.nativeElement;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    // Let the dialog paint first, then focus the first control (or the dialog itself).
    queueMicrotask(() => {
      const preferred = el.querySelector<HTMLElement>('[autofocus]');
      (preferred || this.focusables()[0] || el).focus({ preventScroll: true });
    });
  }

  ngOnDestroy(): void {
    const target = this.previouslyFocused;
    if (target && document.contains(target)) queueMicrotask(() => target.focus({ preventScroll: true }));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.escaped.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = this.focusables();
    if (items.length === 0) { event.preventDefault(); return; }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey && (active === first || !this.host.nativeElement.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
  }
}
