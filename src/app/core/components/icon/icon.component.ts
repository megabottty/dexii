import { Component, input } from '@angular/core';

/** Inline SVG icons that take the text colour of their parent. Decorative: the button carries the name. */
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    @switch (name()) {
      @case ('pause') {
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4.5" height="16" rx="1.2"/><rect x="13.5" y="4" width="4.5" height="16" rx="1.2"/></svg>
      }
      @case ('play') {
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" focusable="false"><path d="M7 4.8v14.4a1 1 0 0 0 1.52.86l11.2-7.2a1 1 0 0 0 0-1.72L8.52 3.94A1 1 0 0 0 7 4.8z"/></svg>
      }
      @case ('trash') {
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/></svg>
      }
    }
  `
})
export class IconComponent {
  readonly name = input.required<'pause' | 'play' | 'trash'>();
}
