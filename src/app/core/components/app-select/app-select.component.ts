import { ChangeDetectionStrategy, Component, ElementRef, HostListener, booleanAttribute, computed, effect, forwardRef, inject, input, model, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';

export interface SelectOption<T = string> {
  value: T;
  label: string;
}

/**
 * The app's dropdown. A themed field that opens a list anchored right under it (fixed-positioned, so it
 * is never clipped by a card or modal and flips upward when there is no room below). Works with
 * `[(ngModel)]` / `[ngModel]` as well as `[value]` + `(valueChange)`. Arrow keys, Enter, Escape, Home/End.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppSelectComponent), multi: true }],
  styleUrl: './app-select.component.css',
  host: { '[class.app-select--inline]': 'inline()', '[class.app-select--compact]': 'compact()' },
  template: `
    <button #trigger type="button" class="sel__btn"
            [id]="id() || null"
            role="combobox" aria-haspopup="listbox"
            [attr.aria-expanded]="open()"
            [attr.aria-controls]="open() ? listId : null"
            [attr.aria-label]="ariaLabel() || null"
            [disabled]="disabled()"
            [style.background-color]="theme.colors().bgSecondary"
            [style.border]="'1px solid ' + (open() ? theme.colors().primary : theme.colors().border)"
            [style.color]="theme.colors().text"
            (click)="toggle()"
            (keydown)="onKeydown($event)">
      <span class="sel__label" [class.sel__label--placeholder]="!selected()">{{ selected()?.label || placeholder() }}</span>
      <span class="sel__chevron" [class.sel__chevron--open]="open()" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </span>
    </button>
    @if (open()) {
      <ul #menu class="sel__menu" [class.sel__menu--up]="openUp()" role="listbox" [id]="listId"
          [style.top.px]="menuTop()" [style.left.px]="menuLeft()" [style.width.px]="menuWidth()"
          [style.background-color]="theme.colors().bg" [style.border]="'1px solid ' + theme.colors().border">
        @for (option of items(); track $index; let i = $index) {
          <li role="option" class="sel__opt"
              [attr.aria-selected]="isSelected(option)"
              [class.sel__opt--active]="i === activeIndex()"
              [style.color]="isSelected(option) ? theme.colors().onBgPrimary : theme.colors().text"
              [style.background-color]="isSelected(option) ? theme.colors().primary + '22' : (i === activeIndex() ? theme.colors().bgSecondary : 'transparent')"
              (click)="choose(option)" (mousemove)="activeIndex.set(i)">
            <span class="sel__opt-label">{{ option.label }}</span>
            @if (isSelected(option)) { <span class="sel__check" aria-hidden="true">✓</span> }
          </li>
        }
      </ul>
    }
  `
})
export class AppSelectComponent<T = string> implements ControlValueAccessor {
  private static nextId = 0;
  readonly theme = inject(ThemeService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly menu = viewChild<ElementRef<HTMLUListElement>>('menu');

  readonly options = input.required<ReadonlyArray<SelectOption<T>>>();
  /** Two-way: `[(value)]`, or `[value]` + `(valueChange)`. `ngModel` works too (ControlValueAccessor). */
  readonly value = model<T | null>(null);
  readonly id = input('');
  readonly ariaLabel = input('');
  readonly placeholder = input('Choose…');
  /** Inline: sits in a row at its natural width instead of filling the line. */
  readonly inline = input(false, { transform: booleanAttribute });
  /** Compact: a smaller field for dense rows. */
  readonly compact = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly listId = `app-select-list-${AppSelectComponent.nextId++}`;
  readonly open = signal(false);
  readonly activeIndex = signal(-1);
  readonly openUp = signal(false);
  readonly menuTop = signal(0);
  readonly menuLeft = signal(0);
  readonly menuWidth = signal(0);
  /** Tolerates an undefined options binding (seen in unit tests), rendering as an empty list. */
  readonly items = computed<ReadonlyArray<SelectOption<T>>>(() => this.options() ?? []);
  readonly selected = computed(() => this.items().find((option) => option.value === this.value()) ?? null);

  private onChange: (value: T | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Keep the open menu glued to the field while the page scrolls or resizes.
    effect((onCleanup) => {
      if (!this.open()) return;
      const reposition = () => this.position();
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      onCleanup(() => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); });
    });
  }

  // ---- ControlValueAccessor ----
  writeValue(value: T | null): void { this.value.set(value ?? null); }
  registerOnChange(fn: (value: T | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  isSelected(option: SelectOption<T>): boolean { return option.value === this.value(); }

  toggle(): void { this.open() ? this.close() : this.openMenu(); }

  openMenu(): void {
    if (this.disabled()) return;
    const current = this.items().findIndex((option) => option.value === this.value());
    this.activeIndex.set(current >= 0 ? current : 0);
    this.open.set(true);
    this.position();
    queueMicrotask(() => { this.position(); this.scrollActiveIntoView(); });
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.onTouched();
  }

  choose(option: SelectOption<T>): void {
    if (option.value !== this.value()) {
      this.value.set(option.value);
      this.onChange(option.value);
    }
    this.close();
    this.trigger()?.nativeElement.focus();
  }

  onKeydown(event: KeyboardEvent): void {
    const count = this.items().length;
    switch (event.key) {
      case 'ArrowDown': case 'ArrowUp': {
        event.preventDefault();
        if (!this.open()) { this.openMenu(); return; }
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        this.activeIndex.set((this.activeIndex() + delta + count) % count);
        this.scrollActiveIntoView();
        return;
      }
      case 'Home': if (this.open()) { event.preventDefault(); this.activeIndex.set(0); this.scrollActiveIntoView(); } return;
      case 'End': if (this.open()) { event.preventDefault(); this.activeIndex.set(count - 1); this.scrollActiveIntoView(); } return;
      case 'Enter': case ' ': {
        event.preventDefault();
        if (!this.open()) { this.openMenu(); return; }
        const option = this.items()[this.activeIndex()];
        if (option) this.choose(option); else this.close();
        return;
      }
      case 'Escape': if (this.open()) { event.preventDefault(); this.close(); } return;
      case 'Tab': this.close(); return;
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.open()) return;
    const target = event.target as Node | null;
    if (target && (this.host.nativeElement.contains(target) || this.menu()?.nativeElement.contains(target))) return;
    this.close();
  }

  /** Fixed-position the list under (or above) the field so no overflow:hidden ancestor can clip it. */
  private position(): void {
    const field = this.trigger()?.nativeElement;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const estimated = Math.min(this.items().length * 44 + 14, 280);
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const up = spaceBelow < estimated && rect.top > spaceBelow;
    this.openUp.set(up);
    this.menuLeft.set(rect.left);
    this.menuWidth.set(Math.max(rect.width, 160));
    const menuHeight = this.menu()?.nativeElement.offsetHeight || estimated;
    this.menuTop.set(up ? Math.max(8, rect.top - 6 - menuHeight) : rect.bottom + 6);
  }

  private scrollActiveIntoView(): void {
    const item = this.menu()?.nativeElement.children.item(this.activeIndex()) as HTMLElement | null;
    item?.scrollIntoView({ block: 'nearest' });
  }
}
