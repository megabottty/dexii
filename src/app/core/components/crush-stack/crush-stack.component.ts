import { ChangeDetectionStrategy, Component, TemplateRef, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CrushProfile } from '../../models/crush-profile.model';
import { ThemeService } from '../../services/theme.service';
import { syncOrder, toBack, toFront } from './crush-stack.util';

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 0.6; // px per ms
const TAP_DISTANCE = 6;
const FLING_MS = 260;
const HINT_KEY = 'dexii_stack_hint_seen';

/**
 * Crushes as a deck: the front card is swipeable (left or right sends it to the
 * back, like flipping a rolodex), tap opens it, and Prev / Next / arrow keys do
 * the same without touch. The card itself comes from the caller as a template,
 * so the deck and the grid share one card.
 */
@Component({
  selector: 'app-crush-stack',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  styleUrl: './crush-stack.component.css',
  template: `
    @if (visible().length > 0) {
      <div class="cs" role="region" aria-roledescription="carousel" [attr.aria-label]="'Your crushes, ' + order().length + ' cards. Swipe or use the arrow keys.'"
           tabindex="0" (keydown)="onKeydown($event)">
        @for (item of visible(); track item.id; let k = $index) {
          <div [class]="cardClass() + ' cs-card'"
               [class.cs-card--front]="k === 0"
               [class.cs-card--dragging]="k === 0 && dragging()"
               [class.cs-card--leaving]="k === 0 && leaving() !== null"
               [class.cs-card--still]="reduceMotion"
               [style.transform]="transformFor(k)"
               [style.z-index]="10 - k"
               [style.opacity]="k === 0 ? 1 : 1 - k * 0.08"
               [style.background-color]="theme.colors().cardBg"
               [style.border]="'1px solid ' + theme.colors().border"
               [attr.aria-hidden]="k !== 0"
               [attr.inert]="k !== 0 ? '' : null"
               role="group"
               [attr.aria-label]="k === 0 ? nameOf(item) + ', card ' + (position() + 1) + ' of ' + order().length : null"
               (pointerdown)="k === 0 && onPointerDown($event)"
               (pointermove)="k === 0 && onPointerMove($event)"
               (pointerup)="k === 0 && onPointerUp($event)"
               (pointercancel)="k === 0 && onPointerCancel()"
               (click)="k === 0 && onCardClick($event, item)">
            <ng-container *ngTemplateOutlet="cardTemplate(); context: { $implicit: item }"></ng-container>
          </div>
        }
      </div>

      <div class="cs-controls">
        <button type="button" class="cs-btn" (click)="prev()" [disabled]="order().length < 2"
                [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" aria-label="Previous crush">‹ Prev</button>
        <span class="cs-counter" [style.color]="theme.colors().textSecondary" aria-live="polite">{{ position() + 1 }} / {{ order().length }}</span>
        <button type="button" class="cs-btn" (click)="next()" [disabled]="order().length < 2"
                [style.border]="'1px solid ' + theme.colors().border" [style.color]="theme.colors().text" aria-label="Next crush">Next ›</button>
      </div>
      @if (showHint()) {
        <p class="cs-hint" [style.color]="theme.colors().textSecondary">Swipe the card or use the arrows · tap to open</p>
      }
    }
  `
})
export class CrushStackComponent {
  readonly crushes = input.required<CrushProfile[]>();
  readonly cardTemplate = input.required<TemplateRef<{ $implicit: CrushProfile }>>();
  /** Classes that give the deck's cards the same look as the grid's. */
  readonly cardClass = input('');
  readonly open = output<CrushProfile>();

  readonly theme = inject(ThemeService);
  readonly reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Deck order, front card first. */
  readonly order = signal<string[]>([]);
  /** How far along the deck the front card sits (for the "3 / 8" counter). */
  readonly position = signal(0);
  readonly dragging = signal(false);
  readonly dragX = signal(0);
  readonly leaving = signal<'left' | 'right' | null>(null);
  readonly showHint = signal(this.readHint());

  private readonly byId = computed(() => new Map(this.crushes().map((crush) => [crush.id, crush])));
  readonly visible = computed(() => this.order().slice(0, 4).map((id) => this.byId().get(id)).filter((c): c is CrushProfile => Boolean(c)));

  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private startAt = 0;
  private lastX = 0;
  private lastAt = 0;
  private wasDrag = false;
  private horizontal: boolean | null = null;

  constructor() {
    effect(() => {
      const ids = this.crushes().map((crush) => crush.id);
      untracked(() => {
        this.order.set(syncOrder(this.order(), ids));
        if (this.position() >= ids.length) this.position.set(0);
      });
    });
  }

  nameOf(crush: CrushProfile): string {
    return crush.displayName === 'fullName' && crush.fullName ? crush.fullName : crush.nickname;
  }

  transformFor(k: number): string {
    if (k === 0) {
      const leaving = this.leaving();
      if (leaving) return `translateX(${leaving === 'left' ? '-130%' : '130%'}) rotate(${leaving === 'left' ? -18 : 18}deg)`;
      const x = this.dragX();
      return x ? `translateX(${x}px) rotate(${x / 20}deg)` : 'none';
    }
    return `translateY(${k * 12}px) scale(${1 - k * 0.045})`;
  }

  // ---------- pointer swipe ----------
  onPointerDown(event: PointerEvent): void {
    if (this.leaving() || event.button !== 0) return;
    const target = event.target as Element | null;
    if (target?.closest('button, a, input, select, textarea')) return;
    this.pointerId = event.pointerId;
    this.startX = this.lastX = event.clientX;
    this.startY = event.clientY;
    this.startAt = this.lastAt = performance.now();
    this.wasDrag = false;
    this.horizontal = null;
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    if (this.horizontal === null) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      this.horizontal = Math.abs(dx) > Math.abs(dy);
      if (!this.horizontal) { this.pointerId = null; return; } // let the page scroll
    }
    this.wasDrag = this.wasDrag || Math.abs(dx) > TAP_DISTANCE;
    this.dragging.set(true);
    this.dragX.set(this.reduceMotion ? Math.sign(dx) * Math.min(Math.abs(dx), 24) : dx);
    this.lastX = event.clientX;
    this.lastAt = performance.now();
  }

  onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) return;
    this.pointerId = null;
    const dx = event.clientX - this.startX;
    const dt = Math.max(1, performance.now() - this.lastAt + 1);
    const velocity = Math.abs(event.clientX - this.lastX) / dt;
    this.dragging.set(false);
    if (this.wasDrag && (Math.abs(dx) > SWIPE_DISTANCE || velocity > SWIPE_VELOCITY)) {
      this.fling(dx < 0 ? 'left' : 'right');
    } else {
      this.dragX.set(0);
    }
  }

  onPointerCancel(): void {
    this.pointerId = null;
    this.dragging.set(false);
    this.dragX.set(0);
  }

  onCardClick(event: MouseEvent, crush: CrushProfile): void {
    if (this.wasDrag) { event.preventDefault(); event.stopPropagation(); this.wasDrag = false; return; }
    this.open.emit(crush);
  }

  // ---------- deck moves ----------
  private fling(direction: 'left' | 'right'): void {
    this.markHintSeen();
    if (this.reduceMotion) { this.advance(); return; }
    this.leaving.set(direction);
    setTimeout(() => { this.advance(); this.leaving.set(null); }, FLING_MS);
  }

  private advance(): void {
    this.dragX.set(0);
    this.order.update(toBack);
    this.position.update((p) => (p + 1) % Math.max(1, this.order().length));
  }

  next(): void {
    if (this.order().length < 2 || this.leaving()) return;
    this.fling('left');
  }

  prev(): void {
    if (this.order().length < 2 || this.leaving()) return;
    this.markHintSeen();
    this.dragX.set(0);
    this.order.update(toFront);
    this.position.update((p) => (p - 1 + this.order().length) % this.order().length);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowRight') { event.preventDefault(); this.next(); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); this.prev(); }
    else if (event.key === 'Enter' || event.key === ' ') {
      const front = this.visible()[0];
      if (front && (event.target as HTMLElement).classList.contains('cs')) { event.preventDefault(); this.open.emit(front); }
    }
  }

  private readHint(): boolean {
    try { return localStorage.getItem(HINT_KEY) !== '1'; } catch { return true; }
  }
  private markHintSeen(): void {
    if (!this.showHint()) return;
    this.showHint.set(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ }
  }
}
